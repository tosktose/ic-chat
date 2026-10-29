-- IC Chat: painel do Super Admin ligado ao banco (configurações, planos, empresas e usuários reais).
-- Execute DEPOIS de 20261029_000003_payments.sql.

-- ---------------------------------------------------------------------------------------------
-- Configurações da plataforma (contato, endereço do site...). Só o Super Admin altera.
create table if not exists ic_chat.platform_settings (
  key text primary key check (key ~ '^[a-z_]{2,40}$'),
  value text not null default '',
  updated_at timestamptz not null default now()
);
alter table ic_chat.platform_settings enable row level security;
drop policy if exists platform_settings_admin on ic_chat.platform_settings;
create policy platform_settings_admin on ic_chat.platform_settings for all to authenticated
  using (ic_chat.is_platform_admin()) with check (ic_chat.is_platform_admin());
revoke all on ic_chat.platform_settings from anon, authenticated;
grant select, insert, update, delete on ic_chat.platform_settings to authenticated;
grant all on ic_chat.platform_settings to service_role;

insert into ic_chat.platform_settings(key, value) values
  ('company_name', 'ItaCondo'),
  ('support_email', 'itacondo@gmail.com'),
  ('support_whatsapp', ''),
  ('site_url', 'https://ic-chat-desktop.vercel.app')
on conflict (key) do nothing;

-- O que o site e o app podem mostrar a qualquer visitante (contato de suporte etc.)
create or replace function ic_chat.public_settings()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
    from ic_chat.platform_settings
   where key in ('company_name', 'support_email', 'support_whatsapp', 'site_url')
$$;
revoke all on function ic_chat.public_settings() from public;
grant execute on function ic_chat.public_settings() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Planos: uma única fonte para o site, a tela Assinar, o checkout e o painel.
create table if not exists ic_chat.plans (
  id text primary key check (id in ('start', 'pro', 'business')),
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  days int not null default 30 check (days between 1 and 3660),
  max_users int,
  max_devices int not null default 3 check (max_devices between 1 and 500),
  summary text not null default '',
  features jsonb not null default '[]'::jsonb,
  highlight boolean not null default false,
  active boolean not null default true,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
alter table ic_chat.plans enable row level security;
drop policy if exists plans_read on ic_chat.plans;
create policy plans_read on ic_chat.plans for select to anon, authenticated using (active or ic_chat.is_platform_admin());
drop policy if exists plans_admin_write on ic_chat.plans;
create policy plans_admin_write on ic_chat.plans for all to authenticated
  using (ic_chat.is_platform_admin()) with check (ic_chat.is_platform_admin());
revoke all on ic_chat.plans from anon, authenticated;
grant select on ic_chat.plans to anon;
grant select, insert, update, delete on ic_chat.plans to authenticated;
grant all on ic_chat.plans to service_role;

insert into ic_chat.plans(id, name, price, days, max_users, max_devices, summary, features, highlight, sort) values
  ('start', 'Start', 79, 30, 3, 3, 'Para organizar o atendimento e não perder nenhum contato.',
    '["Até 3 usuários","Caixa de entrada e contatos","Funil de vendas","Agenda e relatórios essenciais"]'::jsonb, false, 1),
  ('pro', 'Pro', 149, 30, 10, 10, 'Para equipes que querem automatizar e acompanhar resultados.',
    '["Até 10 usuários","Tudo do Start","Assistente IA e automações","Relatórios por canal e conversão"]'::jsonb, true, 2),
  ('business', 'Business', 299, 30, null, 50, 'Para operações em crescimento e mais de uma unidade.',
    '["Usuários ampliados","Tudo do Pro","Múltiplas unidades","Integrações e suporte prioritário"]'::jsonb, false, 3)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Visão do Super Admin: empresas com o dono de cada uma (o banco de usuários é compartilhado com outros projetos).
create or replace function ic_chat.admin_tenants()
returns table (
  id uuid, name text, created_at timestamptz, owner_email text, owner_name text, origin_role text, members int,
  sub_status text, sub_plan text, trial_ends_at timestamptz, period_ends_at timestamptz, licenses_active int, last_payment_at timestamptz
) language plpgsql security definer set search_path = '' as $$
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select t.id, t.name, t.created_at, ou.email::text, coalesce(om.display_name, ou.email)::text,
           (ou.raw_user_meta_data ->> 'role')::text,
           (select count(*)::int from ic_chat.tenant_members x where x.tenant_id = t.id),
           s.status, s.plan, s.trial_ends_at, s.current_period_ends_at,
           (select count(*)::int from ic_chat.licenses l where l.tenant_id = t.id and l.status = 'ativa' and l.expires_at > now()),
           (select max(p.paid_at) from ic_chat.payments p where p.tenant_id = t.id)
      from ic_chat.tenants t
      left join lateral (
        select m.user_id, m.display_name from ic_chat.tenant_members m
         where m.tenant_id = t.id order by (m.role = 'owner') desc, m.created_at limit 1
      ) om on true
      left join auth.users ou on ou.id = om.user_id
      left join ic_chat.subscriptions s on s.tenant_id = t.id
     order by t.created_at desc;
end $$;

create or replace function ic_chat.admin_members()
returns table (
  user_id uuid, email text, display_name text, role text, tenant_id uuid, tenant_name text,
  origin_role text, last_sign_in_at timestamptz, created_at timestamptz
) language plpgsql security definer set search_path = '' as $$
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select m.user_id, u.email::text, m.display_name, m.role, t.id, t.name,
           (u.raw_user_meta_data ->> 'role')::text, u.last_sign_in_at, m.created_at
      from ic_chat.tenant_members m
      join ic_chat.tenants t on t.id = m.tenant_id
      join auth.users u on u.id = m.user_id
     order by m.created_at desc;
end $$;

revoke all on function ic_chat.admin_tenants() from public, anon;
revoke all on function ic_chat.admin_members() from public, anon;
grant execute on function ic_chat.admin_tenants() to authenticated, service_role;
grant execute on function ic_chat.admin_members() to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Ações do Super Admin sobre uma empresa (renovar / bloquear por falta de pagamento / liberar)
create or replace function ic_chat.admin_extend_tenant(p_tenant uuid, p_days int)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare exp timestamptz;
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_days < 1 or p_days > 3660 then raise exception 'invalid_days'; end if;
  update ic_chat.subscriptions
     set status = 'active', current_period_ends_at = greatest(now(), coalesce(current_period_ends_at, now())) + make_interval(days => p_days)
   where tenant_id = p_tenant returning current_period_ends_at into exp;
  if exp is null then raise exception 'tenant_not_found'; end if;
  update ic_chat.licenses
     set expires_at = greatest(expires_at, now()) + make_interval(days => p_days), status = 'ativa', revoked_at = null
   where tenant_id = p_tenant and status in ('ativa', 'suspensa');
  return exp;
end $$;

create or replace function ic_chat.admin_set_tenant_blocked(p_tenant uuid, p_blocked boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_blocked then
    update ic_chat.subscriptions set status = 'past_due' where tenant_id = p_tenant;
    update ic_chat.licenses set status = 'suspensa' where tenant_id = p_tenant and status = 'ativa';
  else
    update ic_chat.subscriptions
       set status = case
         when current_period_ends_at is not null and current_period_ends_at > now() then 'active'
         when trial_ends_at > now() then 'trialing'
         else 'expired' end
     where tenant_id = p_tenant;
    update ic_chat.licenses set status = 'ativa' where tenant_id = p_tenant and status = 'suspensa' and expires_at > now();
  end if;
end $$;

revoke all on function ic_chat.admin_extend_tenant(uuid, int) from public, anon;
revoke all on function ic_chat.admin_set_tenant_blocked(uuid, boolean) from public, anon;
grant execute on function ic_chat.admin_extend_tenant(uuid, int) to authenticated, service_role;
grant execute on function ic_chat.admin_set_tenant_blocked(uuid, boolean) to authenticated, service_role;
