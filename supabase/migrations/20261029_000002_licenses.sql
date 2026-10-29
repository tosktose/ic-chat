-- IC Chat: licenças do aplicativo instalado + administradores da plataforma.
-- Execute DEPOIS de 20261028_000001_create_ic_chat_schema.sql.
--
-- Como funciona:
--  * O Super Admin gera a chave pelo painel (função generate_license). A chave aparece UMA vez;
--    no banco fica só o hash SHA-256 (quem ler a tabela não consegue usar as chaves).
--  * O app instalado chama validate_license(chave, id_do_computador). Se a licença estiver
--    revogada/suspensa/vencida ou a assinatura da empresa estiver inadimplente, volta valid=false
--    e o app bloqueia.
--  * Ninguém altera licenças direto na tabela: só pelas funções abaixo.

create table if not exists ic_chat.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- O dono da plataforma (usuário já existente no banco compartilhado)
insert into ic_chat.platform_admins(user_id)
  select id from auth.users where lower(email) = 'superadmin@itacondo.com.br'
  on conflict do nothing;

create or replace function ic_chat.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from ic_chat.platform_admins a where a.user_id = (select auth.uid()))
$$;

create table if not exists ic_chat.licenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ic_chat.tenants(id) on delete cascade,
  key_prefix text not null,
  key_hash text not null unique,
  kind text not null check (kind in ('teste', 'mensal', 'trimestral', 'anual')),
  status text not null default 'ativa' check (status in ('ativa', 'suspensa', 'revogada')),
  max_devices int not null default 3 check (max_devices between 1 and 500),
  expires_at timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_validated_at timestamptz
);
create index if not exists licenses_tenant_idx on ic_chat.licenses(tenant_id);

create table if not exists ic_chat.license_activations (
  license_id uuid not null references ic_chat.licenses(id) on delete cascade,
  device_id text not null check (length(device_id) between 8 and 128),
  device_name text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (license_id, device_id)
);

alter table ic_chat.platform_admins enable row level security;
alter table ic_chat.licenses enable row level security;
alter table ic_chat.license_activations enable row level security;

-- Leitura: o dono da plataforma vê tudo; a empresa vê as próprias licenças. Escrita: só pelas funções.
drop policy if exists platform_admins_self on ic_chat.platform_admins;
create policy platform_admins_self on ic_chat.platform_admins for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists licenses_read on ic_chat.licenses;
create policy licenses_read on ic_chat.licenses for select to authenticated
  using (ic_chat.is_platform_admin() or ic_chat.is_tenant_member(tenant_id));
drop policy if exists activations_admin_read on ic_chat.license_activations;
create policy activations_admin_read on ic_chat.license_activations for select to authenticated using (ic_chat.is_platform_admin());

-- O dono da plataforma enxerga todas as empresas e assinaturas (para escolher a empresa da chave e cobrar)
drop policy if exists tenants_platform_admin_read on ic_chat.tenants;
create policy tenants_platform_admin_read on ic_chat.tenants for select to authenticated using (ic_chat.is_platform_admin());
drop policy if exists subscriptions_platform_admin_read on ic_chat.subscriptions;
create policy subscriptions_platform_admin_read on ic_chat.subscriptions for select to authenticated using (ic_chat.is_platform_admin());

revoke all on ic_chat.platform_admins, ic_chat.licenses, ic_chat.license_activations from anon, authenticated;
grant select on ic_chat.platform_admins, ic_chat.licenses, ic_chat.license_activations to authenticated;
grant all on ic_chat.platform_admins, ic_chat.licenses, ic_chat.license_activations to service_role;

-- ---------------------------------------------------------------------------------------------
-- Gerar chave (somente Super Admin). Retorna a chave em texto UMA vez; só o hash é guardado.
create or replace function ic_chat.generate_license(
  p_tenant uuid, p_kind text default 'mensal', p_max_devices int default 3, p_days int default null, p_replace boolean default true
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  raw text; k text; lic_days int; lic_id uuid; exp timestamptz;
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from ic_chat.tenants where id = p_tenant) then raise exception 'tenant_not_found'; end if;
  if p_kind not in ('teste', 'mensal', 'trimestral', 'anual') then raise exception 'invalid_kind'; end if;

  lic_days := coalesce(p_days, case p_kind when 'teste' then 7 when 'mensal' then 30 when 'trimestral' then 90 else 365 end);
  if lic_days < 1 or lic_days > 3660 then raise exception 'invalid_days'; end if;

  -- 20 caracteres hexadecimais de um hash de valores aleatórios (80 bits)
  raw := upper(encode(sha256(convert_to(gen_random_uuid()::text || gen_random_uuid()::text || clock_timestamp()::text, 'utf8')), 'hex'));
  k := 'ICCH-' || substr(raw, 1, 5) || '-' || substr(raw, 6, 5) || '-' || substr(raw, 11, 5) || '-' || substr(raw, 16, 5);
  exp := now() + make_interval(days => lic_days);

  if p_replace then
    update ic_chat.licenses set status = 'revogada', revoked_at = now() where tenant_id = p_tenant and status = 'ativa';
  end if;

  insert into ic_chat.licenses(tenant_id, key_prefix, key_hash, kind, max_devices, expires_at, created_by)
  values (p_tenant, substr(k, 1, 10), encode(sha256(convert_to(k, 'utf8')), 'hex'), p_kind, greatest(p_max_devices, 1), exp, (select auth.uid()))
  returning id into lic_id;

  return jsonb_build_object('id', lic_id, 'key', k, 'expires_at', exp, 'kind', p_kind);
end $$;

-- Ativar / suspender (inadimplência) / revogar
create or replace function ic_chat.set_license_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('ativa', 'suspensa', 'revogada') then raise exception 'invalid_status'; end if;
  update ic_chat.licenses
     set status = p_status, revoked_at = case when p_status = 'revogada' then now() else null end
   where id = p_id;
end $$;

-- Renovar (após pagamento): soma dias a partir da validade atual ou de hoje, o que for maior
create or replace function ic_chat.extend_license(p_id uuid, p_days int)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare exp timestamptz;
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_days < 1 or p_days > 3660 then raise exception 'invalid_days'; end if;
  update ic_chat.licenses
     set expires_at = greatest(expires_at, now()) + make_interval(days => p_days), status = 'ativa', revoked_at = null
   where id = p_id returning expires_at into exp;
  return exp;
end $$;

-- Validação feita pelo aplicativo instalado (pode ser chamada sem login).
create or replace function ic_chat.validate_license(p_key text, p_device_id text, p_device_name text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  lic ic_chat.licenses%rowtype; sub_status text; tenant_name text; devices int; known boolean;
begin
  if p_key is null or length(p_key) > 64 or p_device_id is null or length(p_device_id) < 8 or length(p_device_id) > 128 then
    return jsonb_build_object('valid', false, 'reason', 'invalid');
  end if;

  select * into lic from ic_chat.licenses where key_hash = encode(sha256(convert_to(upper(trim(p_key)), 'utf8')), 'hex');
  if not found then return jsonb_build_object('valid', false, 'reason', 'invalid'); end if;

  select t.name into tenant_name from ic_chat.tenants t where t.id = lic.tenant_id;
  select s.status into sub_status from ic_chat.subscriptions s where s.tenant_id = lic.tenant_id;

  if lic.status = 'revogada' then return jsonb_build_object('valid', false, 'reason', 'revoked', 'tenant_name', tenant_name); end if;
  if lic.status = 'suspensa' then return jsonb_build_object('valid', false, 'reason', 'suspended', 'tenant_name', tenant_name); end if;
  if lic.expires_at <= now() then return jsonb_build_object('valid', false, 'reason', 'expired', 'tenant_name', tenant_name, 'expires_at', lic.expires_at); end if;
  -- Empresa inadimplente: bloqueia mesmo com chave dentro da validade
  if sub_status in ('past_due', 'canceled', 'expired') then return jsonb_build_object('valid', false, 'reason', 'payment', 'tenant_name', tenant_name); end if;

  select exists (select 1 from ic_chat.license_activations a where a.license_id = lic.id and a.device_id = p_device_id) into known;
  select count(*) into devices from ic_chat.license_activations a where a.license_id = lic.id;
  if not known and devices >= lic.max_devices then
    return jsonb_build_object('valid', false, 'reason', 'device_limit', 'tenant_name', tenant_name, 'max_devices', lic.max_devices);
  end if;

  insert into ic_chat.license_activations(license_id, device_id, device_name)
    values (lic.id, p_device_id, left(p_device_name, 120))
    on conflict (license_id, device_id) do update set last_seen_at = now(), device_name = coalesce(excluded.device_name, ic_chat.license_activations.device_name);
  update ic_chat.licenses set last_validated_at = now() where id = lic.id;

  return jsonb_build_object(
    'valid', true, 'reason', 'ok', 'tenant_name', tenant_name, 'kind', lic.kind, 'expires_at', lic.expires_at,
    'days_left', greatest(0, ceil(extract(epoch from (lic.expires_at - now())) / 86400)::int),
    'max_devices', lic.max_devices, 'recheck_hours', 12
  );
end $$;

revoke all on function ic_chat.is_platform_admin() from public, anon;
revoke all on function ic_chat.generate_license(uuid, text, int, int, boolean) from public, anon;
revoke all on function ic_chat.set_license_status(uuid, text) from public, anon;
revoke all on function ic_chat.extend_license(uuid, int) from public, anon;
revoke all on function ic_chat.validate_license(text, text, text) from public;
grant execute on function ic_chat.is_platform_admin() to authenticated, service_role;
grant execute on function ic_chat.generate_license(uuid, text, int, int, boolean) to authenticated, service_role;
grant execute on function ic_chat.set_license_status(uuid, text) to authenticated, service_role;
grant execute on function ic_chat.extend_license(uuid, int) to authenticated, service_role;
-- O app instalado valida antes de qualquer login
grant usage on schema ic_chat to anon;
grant execute on function ic_chat.validate_license(text, text, text) to anon, authenticated, service_role;
