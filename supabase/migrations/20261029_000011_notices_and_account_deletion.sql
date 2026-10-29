-- Avisos do IC Chat (e-mail e WhatsApp), chaves de integração extras e exclusão de conta (LGPD).

-- 1) Mais campos de integração aceitos no painel do Super Admin
create or replace function ic_chat.admin_set_integration(p_key text, p_value text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_key <> all(array[
    'openrouter_api_key','openrouter_model','openrouter_base_url',
    'evolution_url','evolution_api_key','evolution_instance','n8n_url','n8n_api_key',
    'google_client_id','google_client_secret',
    'mp_access_token','mp_public_key','mp_webhook_secret',
    'resend_api_key','email_from'
  ]) then raise exception 'invalid_key'; end if;
  if coalesce(trim(p_value),'') = '' then
    delete from ic_chat.platform_secrets where key = p_key;
  else
    insert into ic_chat.platform_secrets(key, value, secret) values (p_key, left(trim(p_value),500), p_key ~ '(api_key|secret|access_token)$')
      on conflict (key) do update set value = excluded.value, secret = excluded.secret, updated_at = now();
  end if;
end $$;

-- 2) Registro dos avisos enviados (para nunca mandar o mesmo aviso duas vezes)
create table if not exists ic_chat.notice_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ic_chat.tenants(id) on delete cascade,
  kind text not null,
  period_key text not null,
  channel text not null default 'email',
  created_at timestamptz not null default now(),
  unique (tenant_id, kind, period_key, channel)
);
alter table ic_chat.notice_log enable row level security;
revoke all on ic_chat.notice_log from public, anon, authenticated;
grant all on ic_chat.notice_log to service_role;

-- 3) Quem precisa de aviso agora. Chamada só pelo servidor (service_role). Reserva a vaga no registro para não repetir.
create or replace function ic_chat.pop_due_notices()
returns table (tenant_id uuid, kind text, period_key text, email text, name text, phone text, ends_at timestamptz, days_left int)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  return query
  with base as (
    select t.id, t.name as tname, s.status, s.plan,
           case when s.status = 'trialing' then s.trial_ends_at else s.current_period_ends_at end as ends,
           (select u.email::text from ic_chat.tenant_members m join auth.users u on u.id = m.user_id
             where m.tenant_id = t.id order by (m.role = 'owner') desc, m.created_at limit 1) as owner_email,
           (select coalesce(cs.data -> 'info' ->> 'whatsapp', cs.data -> 'info' ->> 'phone') from ic_chat.company_settings cs where cs.tenant_id = t.id limit 1) as owner_phone
      from ic_chat.tenants t join ic_chat.subscriptions s on s.tenant_id = t.id
     where not exists (select 1 from ic_chat.hidden_tenants h where h.tenant_id = t.id)
  ), due as (
    select b.*, ceil(extract(epoch from (b.ends - now())) / 86400)::int as d from base b where b.ends is not null and b.owner_email is not null
  ), pick as (
    select d.id, d.tname, d.owner_email, d.owner_phone, d.ends, d.d,
      case
        when d.status = 'trialing' and d.d between 0 and 1 then 'trial_ending_1'
        when d.status = 'trialing' and d.d between 2 and 3 then 'trial_ending_3'
        when d.status = 'active'   and d.d between 0 and 1 then 'plan_ending_1'
        when d.status = 'active'   and d.d between 2 and 3 then 'plan_ending_3'
        when d.status = 'active'   and d.d between 4 and 7 then 'plan_ending_7'
        when d.status in ('trialing','active') and d.d < 0 and d.d >= -2 then 'access_ended'
        when d.status in ('past_due','expired') and d.ends > now() - interval '3 days' then 'access_ended'
      end as k
    from due d
  ), ins as (
    insert into ic_chat.notice_log(tenant_id, kind, period_key, channel)
    select p.id, p.k, to_char(p.ends, 'YYYY-MM-DD'), 'email' from pick p where p.k is not null
    on conflict (tenant_id, kind, period_key, channel) do nothing
    returning notice_log.tenant_id, notice_log.kind, notice_log.period_key
  )
  select p.id, p.k, i.period_key, p.owner_email, p.tname, p.owner_phone, p.ends, p.d
    from pick p join ins i on i.tenant_id = p.id and i.kind = p.k;
end $$;
revoke all on function ic_chat.pop_due_notices() from public, anon, authenticated;
grant execute on function ic_chat.pop_due_notices() to service_role;

-- 4) Aviso de boas-vindas (uma vez por empresa). Devolve true só na primeira chamada.
create or replace function ic_chat.claim_welcome_notice()
returns boolean language plpgsql security definer set search_path = '' as $$
declare tid uuid; n int;
begin
  select m.tenant_id into tid from ic_chat.tenant_members m where m.user_id = (select auth.uid()) order by (m.role = 'owner') desc, m.created_at limit 1;
  if tid is null then return false; end if;
  insert into ic_chat.notice_log(tenant_id, kind, period_key, channel) values (tid, 'welcome', 'once', 'email') on conflict do nothing;
  get diagnostics n = row_count;
  return n > 0;
end $$;
revoke all on function ic_chat.claim_welcome_notice() from public, anon;
grant execute on function ic_chat.claim_welcome_notice() to authenticated, service_role;

-- 5) LGPD: a própria pessoa exclui a empresa dela no IC Chat e todos os dados ligados a ela.
-- O usuário de login (auth.users) NÃO é apagado aqui porque o banco é compartilhado com outros sistemas.
create or replace function ic_chat.delete_my_company(p_confirm text)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); tid uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if lower(trim(coalesce(p_confirm, ''))) <> 'excluir' then raise exception 'confirmation_required'; end if;
  select m.tenant_id into tid from ic_chat.tenant_members m where m.user_id = uid and m.role = 'owner' order by m.created_at limit 1;
  if tid is null then raise exception 'only_owner_can_delete'; end if;
  if ic_chat.is_platform_admin() then raise exception 'platform_admin_cannot_delete'; end if;
  delete from ic_chat.tenants where id = tid; -- tudo da empresa cai em cascata
end $$;
revoke all on function ic_chat.delete_my_company(text) from public, anon;
grant execute on function ic_chat.delete_my_company(text) to authenticated, service_role;
