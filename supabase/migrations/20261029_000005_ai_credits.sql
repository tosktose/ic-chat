-- IC Chat: Créditos de IA (saldo, extrato, pacotes avulsos e configuração). Execute DEPOIS da migração 4.
--
-- Como funciona (o mesmo modelo da tela de Créditos):
--  * 1 crédito = N tokens (padrão 1.000, configurável). Toda chamada de IA debita créditos.
--  * Cada plano INCLUI uma quantidade de créditos por mês (zera todo mês).
--  * Passou do incluído? Consome o saldo AVULSO (créditos comprados em pacotes ou dados de bônus pelo Super Admin).
--  * Acabou tudo? A IA para de responder até a empresa comprar um pacote ou você dar créditos.
--  * Cada uso registra quanto custou ao provedor, para você ver a margem real.
-- Só o servidor (função ai-chat, com a chave de serviço) registra uso. O navegador nunca grava saldo.

alter table ic_chat.plans add column if not exists ai_credits_month int not null default 0 check (ai_credits_month >= 0);
update ic_chat.plans set ai_credits_month = case id when 'start' then 300 when 'pro' then 1000 when 'business' then 5000 else ai_credits_month end
 where ai_credits_month = 0;

-- Configuração (usa a tabela platform_settings já existente)
insert into ic_chat.platform_settings(key, value) values
  ('ai_tokens_per_credit', '1000'),
  ('ai_cost_per_credit', '0.009'),
  ('ai_price_per_credit', '0.04'),
  ('ai_trial_credits', '50')
on conflict (key) do nothing;

create or replace function ic_chat.setting_num(p_key text, p_default numeric)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce((select nullif(value, '')::numeric from ic_chat.platform_settings where key = p_key), p_default)
$$;
revoke all on function ic_chat.setting_num(text, numeric) from public, anon, authenticated;
grant execute on function ic_chat.setting_num(text, numeric) to service_role;

-- Pacotes de créditos avulsos (o que a empresa compra pelo Mercado Pago)
create table if not exists ic_chat.ai_credit_packs (
  id text primary key check (id ~ '^[a-z0-9_]{2,30}$'),
  name text not null,
  credits int not null check (credits > 0),
  price numeric(10, 2) not null check (price >= 0),
  active boolean not null default true,
  sort int not null default 0
);
alter table ic_chat.ai_credit_packs enable row level security;
drop policy if exists packs_read_public on ic_chat.ai_credit_packs;
create policy packs_read_public on ic_chat.ai_credit_packs for select to anon using (active);
drop policy if exists packs_read_auth on ic_chat.ai_credit_packs;
create policy packs_read_auth on ic_chat.ai_credit_packs for select to authenticated using (active or ic_chat.is_platform_admin());
drop policy if exists packs_admin_write on ic_chat.ai_credit_packs;
create policy packs_admin_write on ic_chat.ai_credit_packs for all to authenticated
  using (ic_chat.is_platform_admin()) with check (ic_chat.is_platform_admin());
revoke all on ic_chat.ai_credit_packs from anon, authenticated;
grant select on ic_chat.ai_credit_packs to anon;
grant select, insert, update, delete on ic_chat.ai_credit_packs to authenticated;
grant all on ic_chat.ai_credit_packs to service_role;
insert into ic_chat.ai_credit_packs(id, name, credits, price, sort) values
  ('pack_500', 'Pacote 500', 500, 20.00, 1),
  ('pack_2000', 'Pacote 2.000', 2000, 70.00, 2),
  ('pack_5000', 'Pacote 5.000', 5000, 150.00, 3)
on conflict (id) do nothing;

-- Extrato: toda entrada e saída de créditos
create table if not exists ic_chat.ai_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ic_chat.tenants(id) on delete cascade,
  kind text not null check (kind in ('compra', 'bonus', 'ajuste', 'uso')),
  credits numeric(14, 3) not null,            -- compra/bonus: entra; ajuste: pode ser negativo; uso: quanto foi consumido (positivo)
  from_plan numeric(14, 3) not null default 0, -- (uso) quanto saiu dos créditos incluídos no plano
  from_pack numeric(14, 3) not null default 0, -- (uso) quanto saiu do saldo avulso
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  provider_cost numeric(12, 4) not null default 0, -- (uso) o que você pagou ao provedor
  amount numeric(12, 2) not null default 0,         -- (compra) o que a empresa pagou
  note text,
  ref text unique,                                  -- id do pagamento (evita contar a mesma compra duas vezes)
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ai_ledger_tenant_idx on ic_chat.ai_credit_ledger(tenant_id, created_at desc);
alter table ic_chat.ai_credit_ledger enable row level security;
drop policy if exists ai_ledger_read on ic_chat.ai_credit_ledger;
create policy ai_ledger_read on ic_chat.ai_credit_ledger for select to authenticated
  using (ic_chat.is_platform_admin() or ic_chat.is_tenant_member(tenant_id));
revoke all on ic_chat.ai_credit_ledger from anon, authenticated;
grant select on ic_chat.ai_credit_ledger to authenticated;
grant all on ic_chat.ai_credit_ledger to service_role;

-- Resumo de saldo de uma empresa (uso interno das funções abaixo)
create or replace function ic_chat.ai_summary(p_tenant uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  included numeric; plan_id text; sub_status text;
  plan_used numeric; used_month numeric; pack_in numeric; pack_out numeric; pack_balance numeric; plan_left numeric;
  month_start timestamptz := date_trunc('month', now());
begin
  select s.plan, s.status into plan_id, sub_status from ic_chat.subscriptions s where s.tenant_id = p_tenant;
  if plan_id is null or plan_id = 'trial' then
    included := ic_chat.setting_num('ai_trial_credits', 50);
  else
    select coalesce(p.ai_credits_month, 0) into included from ic_chat.plans p where p.id = plan_id;
  end if;
  included := coalesce(included, 0);

  select coalesce(sum(credits) filter (where kind = 'uso' and created_at >= month_start), 0),
         coalesce(sum(from_plan) filter (where kind = 'uso' and created_at >= month_start), 0),
         coalesce(sum(credits) filter (where kind in ('compra', 'bonus', 'ajuste')), 0),
         coalesce(sum(from_pack) filter (where kind = 'uso'), 0)
    into used_month, plan_used, pack_in, pack_out
    from ic_chat.ai_credit_ledger where tenant_id = p_tenant;

  pack_balance := pack_in - pack_out;
  plan_left := greatest(0, included - plan_used);
  return jsonb_build_object(
    'included', included, 'plan_used', plan_used, 'plan_left', plan_left,
    'pack_balance', pack_balance, 'used_month', used_month,
    'available', plan_left + greatest(pack_balance, 0),
    'tokens_per_credit', ic_chat.setting_num('ai_tokens_per_credit', 1000),
    'price_per_credit', ic_chat.setting_num('ai_price_per_credit', 0.04)
  );
end $$;
revoke all on function ic_chat.ai_summary(uuid) from public, anon, authenticated;
grant execute on function ic_chat.ai_summary(uuid) to service_role;

-- Para a empresa: meu saldo + últimos movimentos
create or replace function ic_chat.my_ai_summary()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare t uuid; s jsonb; rows jsonb;
begin
  select m.tenant_id into t from ic_chat.tenant_members m where m.user_id = (select auth.uid()) limit 1;
  if t is null then raise exception 'tenant_not_found'; end if;
  s := ic_chat.ai_summary(t);
  select coalesce(jsonb_agg(r order by r.created_at desc), '[]'::jsonb) into rows from (
    select l.kind, l.credits, l.note, l.created_at, l.tokens_in + l.tokens_out as tokens
      from ic_chat.ai_credit_ledger l where l.tenant_id = t order by l.created_at desc limit 30
  ) r;
  return s || jsonb_build_object('tenant_id', t, 'ledger', rows);
end $$;
revoke all on function ic_chat.my_ai_summary() from public, anon;
grant execute on function ic_chat.my_ai_summary() to authenticated, service_role;

-- Para o Super Admin: visão de todas as empresas
create or replace function ic_chat.admin_ai_overview()
returns table (
  tenant_id uuid, tenant_name text, owner_email text, plan text, included numeric, plan_used numeric, pack_balance numeric,
  used_month numeric, available numeric, cost_month numeric, bought_month numeric, last_use timestamptz
) language plpgsql stable security definer set search_path = '' as $$
declare month_start timestamptz := date_trunc('month', now());
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select t.id, t.name, ou.email::text, coalesce(s.plan, 'trial'),
           (ic_chat.ai_summary(t.id) ->> 'included')::numeric,
           (ic_chat.ai_summary(t.id) ->> 'plan_used')::numeric,
           (ic_chat.ai_summary(t.id) ->> 'pack_balance')::numeric,
           (ic_chat.ai_summary(t.id) ->> 'used_month')::numeric,
           (ic_chat.ai_summary(t.id) ->> 'available')::numeric,
           coalesce((select sum(l.provider_cost) from ic_chat.ai_credit_ledger l where l.tenant_id = t.id and l.kind = 'uso' and l.created_at >= month_start), 0),
           coalesce((select sum(l.amount) from ic_chat.ai_credit_ledger l where l.tenant_id = t.id and l.kind = 'compra' and l.created_at >= month_start), 0),
           (select max(l.created_at) from ic_chat.ai_credit_ledger l where l.tenant_id = t.id and l.kind = 'uso')
      from ic_chat.tenants t
      left join ic_chat.subscriptions s on s.tenant_id = t.id
      left join lateral (select m.user_id from ic_chat.tenant_members m where m.tenant_id = t.id order by (m.role = 'owner') desc, m.created_at limit 1) om on true
      left join auth.users ou on ou.id = om.user_id
     order by t.created_at desc;
end $$;
revoke all on function ic_chat.admin_ai_overview() from public, anon;
grant execute on function ic_chat.admin_ai_overview() to authenticated, service_role;

-- Extrato de uma empresa (Super Admin)
create or replace function ic_chat.admin_ai_ledger(p_tenant uuid)
returns table (kind text, credits numeric, tokens int, provider_cost numeric, amount numeric, note text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select l.kind, l.credits, l.tokens_in + l.tokens_out, l.provider_cost, l.amount, l.note, l.created_at
      from ic_chat.ai_credit_ledger l where l.tenant_id = p_tenant order by l.created_at desc limit 100;
end $$;
revoke all on function ic_chat.admin_ai_ledger(uuid) from public, anon;
grant execute on function ic_chat.admin_ai_ledger(uuid) to authenticated, service_role;

-- Super Admin dá (ou tira) créditos
create or replace function ic_chat.admin_grant_credits(p_tenant uuid, p_credits numeric, p_kind text default 'bonus', p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_kind not in ('bonus', 'ajuste') then raise exception 'invalid_kind'; end if;
  if p_credits = 0 or abs(p_credits) > 1000000 then raise exception 'invalid_credits'; end if;
  if p_kind = 'bonus' and p_credits < 0 then raise exception 'invalid_credits'; end if;
  if not exists (select 1 from ic_chat.tenants where id = p_tenant) then raise exception 'tenant_not_found'; end if;
  insert into ic_chat.ai_credit_ledger(tenant_id, kind, credits, note, created_by)
    values (p_tenant, p_kind, p_credits, nullif(trim(p_note), ''), (select auth.uid()));
  return ic_chat.ai_summary(p_tenant);
end $$;
revoke all on function ic_chat.admin_grant_credits(uuid, numeric, text, text) from public, anon;
grant execute on function ic_chat.admin_grant_credits(uuid, numeric, text, text) to authenticated, service_role;

-- Servidor: registra o consumo de uma chamada de IA (primeiro tira do plano, depois do saldo avulso)
create or replace function ic_chat.ai_record_usage(p_tenant uuid, p_tokens_in int, p_tokens_out int, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  per_credit numeric := greatest(ic_chat.setting_num('ai_tokens_per_credit', 1000), 1);
  credits numeric; plan_left numeric; from_plan numeric; from_pack numeric; cost numeric; s jsonb;
begin
  if p_tokens_in < 0 or p_tokens_out < 0 then raise exception 'invalid_tokens'; end if;
  credits := round(((p_tokens_in + p_tokens_out)::numeric / per_credit), 3);
  s := ic_chat.ai_summary(p_tenant);
  plan_left := (s ->> 'plan_left')::numeric;
  from_plan := least(credits, plan_left);
  from_pack := credits - from_plan;
  cost := round(credits * ic_chat.setting_num('ai_cost_per_credit', 0.009), 4);
  insert into ic_chat.ai_credit_ledger(tenant_id, kind, credits, from_plan, from_pack, tokens_in, tokens_out, provider_cost, note)
    values (p_tenant, 'uso', credits, from_plan, from_pack, p_tokens_in, p_tokens_out, cost, p_note);
  return ic_chat.ai_summary(p_tenant) || jsonb_build_object('credits_used', credits);
end $$;
revoke all on function ic_chat.ai_record_usage(uuid, int, int, text) from public, anon, authenticated;
grant execute on function ic_chat.ai_record_usage(uuid, int, int, text) to service_role;

-- Servidor: compra de pacote aprovada no Mercado Pago (idempotente pelo id do pagamento)
create or replace function ic_chat.apply_credit_pack(p_tenant uuid, p_pack text, p_provider_payment_id text, p_amount numeric, p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pk ic_chat.ai_credit_packs%rowtype; inserted int;
begin
  if p_status <> 'approved' then return jsonb_build_object('applied', false, 'reason', 'not_approved'); end if;
  select * into pk from ic_chat.ai_credit_packs where id = p_pack;
  if not found then raise exception 'pack_not_found'; end if;
  if p_amount < pk.price then return jsonb_build_object('applied', false, 'reason', 'amount_mismatch'); end if;
  insert into ic_chat.ai_credit_ledger(tenant_id, kind, credits, amount, note, ref)
    values (p_tenant, 'compra', pk.credits, p_amount, pk.name, 'mp:' || p_provider_payment_id)
    on conflict (ref) do nothing;
  get diagnostics inserted = row_count;
  return jsonb_build_object('applied', inserted > 0, 'credits', pk.credits);
end $$;
revoke all on function ic_chat.apply_credit_pack(uuid, text, text, numeric, text) from public, anon, authenticated;
grant execute on function ic_chat.apply_credit_pack(uuid, text, text, numeric, text) to service_role;
