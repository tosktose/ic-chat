-- IC Chat: pagamentos (Mercado Pago). Execute DEPOIS de 20261029_000002_licenses.sql.
--
-- Quem grava aqui é SOMENTE o servidor (Edge Functions, com a chave service_role).
-- O navegador só consegue LER os pagamentos da própria empresa.
-- apply_payment é idempotente: o mesmo pagamento notificado várias vezes só vale uma vez.

create table if not exists ic_chat.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ic_chat.tenants(id) on delete cascade,
  provider text not null default 'mercadopago',
  provider_payment_id text not null,
  plan text not null check (plan in ('start', 'pro', 'business')),
  amount numeric(12, 2) not null,
  days int not null default 30 check (days between 1 and 3660),
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create index if not exists payments_tenant_idx on ic_chat.payments(tenant_id, created_at desc);

alter table ic_chat.payments enable row level security;
drop policy if exists payments_read on ic_chat.payments;
create policy payments_read on ic_chat.payments for select to authenticated
  using (ic_chat.is_platform_admin() or ic_chat.is_tenant_member(tenant_id));
revoke all on ic_chat.payments from anon, authenticated;
grant select on ic_chat.payments to authenticated;
grant all on ic_chat.payments to service_role;

create or replace function ic_chat.apply_payment(
  p_tenant uuid, p_plan text, p_days int, p_provider_payment_id text, p_amount numeric, p_status text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  pay ic_chat.payments%rowtype; base timestamptz;
begin
  if not exists (select 1 from ic_chat.tenants where id = p_tenant) then raise exception 'tenant_not_found'; end if;

  insert into ic_chat.payments(tenant_id, provider_payment_id, plan, amount, days, status)
    values (p_tenant, p_provider_payment_id, p_plan, p_amount, p_days, p_status)
    on conflict (provider, provider_payment_id) do update set status = excluded.status, updated_at = now()
    returning * into pay;

  -- Pago: libera o plano e renova as licenças (apenas na primeira vez que este pagamento aparece como aprovado)
  if p_status = 'approved' and pay.paid_at is null then
    update ic_chat.payments set paid_at = now() where id = pay.id;

    select greatest(now(), coalesce(s.current_period_ends_at, now())) into base from ic_chat.subscriptions s where s.tenant_id = p_tenant;
    update ic_chat.subscriptions
       set plan = p_plan, status = 'active', current_period_ends_at = coalesce(base, now()) + make_interval(days => p_days)
     where tenant_id = p_tenant;

    update ic_chat.licenses
       set expires_at = greatest(expires_at, now()) + make_interval(days => p_days), status = 'ativa', revoked_at = null
     where tenant_id = p_tenant and status in ('ativa', 'suspensa');

    return jsonb_build_object('applied', true, 'action', 'activated');
  end if;

  -- Estorno / contestação de um pagamento que já tinha sido aprovado: corta o acesso
  if p_status in ('refunded', 'charged_back') and pay.paid_at is not null then
    update ic_chat.subscriptions set status = 'past_due' where tenant_id = p_tenant;
    update ic_chat.licenses set status = 'suspensa' where tenant_id = p_tenant and status = 'ativa';
    return jsonb_build_object('applied', true, 'action', 'suspended');
  end if;

  return jsonb_build_object('applied', false);
end $$;

revoke all on function ic_chat.apply_payment(uuid, text, int, text, numeric, text) from public, anon, authenticated;
grant execute on function ic_chat.apply_payment(uuid, text, int, text, numeric, text) to service_role;

-- Quem não renovou: marca como pendente as assinaturas vencidas (rode por agendamento, ex.: pg_cron diário)
create or replace function ic_chat.expire_overdue_subscriptions()
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  with late as (
    update ic_chat.subscriptions set status = 'past_due'
     where status = 'active' and current_period_ends_at is not null and current_period_ends_at < now() - interval '3 days'
    returning tenant_id
  )
  update ic_chat.licenses l set status = 'suspensa' from late where l.tenant_id = late.tenant_id and l.status = 'ativa';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function ic_chat.expire_overdue_subscriptions() from public, anon, authenticated;
grant execute on function ic_chat.expire_overdue_subscriptions() to service_role;
