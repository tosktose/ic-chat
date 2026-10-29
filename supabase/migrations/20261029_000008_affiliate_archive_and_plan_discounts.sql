-- Desativação reversível do cadastro de afiliado e descontos promocionais para planos.
-- O arquivo mantém indicações e comissões para auditoria e histórico financeiro.

alter table ic_chat.affiliate_profiles
  add column if not exists archived_at timestamptz;

create or replace function ic_chat.admin_archive_affiliate(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update ic_chat.affiliate_profiles
     set active = false, archived_at = now(), updated_at = now()
   where user_id = p_user_id;
  if not found then raise exception 'affiliate_not_found'; end if;
end $$;
revoke all on function ic_chat.admin_archive_affiliate(uuid) from public, anon;
grant execute on function ic_chat.admin_archive_affiliate(uuid) to authenticated, service_role;

create or replace function ic_chat.admin_set_affiliate(p_user_id uuid, p_enabled boolean, p_commission_rate numeric default 10)
returns table (user_id uuid, referral_code text, commission_rate numeric, active boolean)
language plpgsql security definer set search_path = '' as $$
declare code text;
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_commission_rate is null or p_commission_rate < 0 or p_commission_rate > 100 then raise exception 'invalid_commission_rate'; end if;
  if not exists(select 1 from ic_chat.tenant_members m where m.user_id = p_user_id) then raise exception 'user_not_found'; end if;
  if p_enabled then
    insert into ic_chat.affiliate_profiles(user_id, referral_code, commission_rate, active, archived_at)
      values (p_user_id, lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), p_commission_rate, true, null)
      on conflict on constraint affiliate_profiles_pkey do update set commission_rate = excluded.commission_rate, active = true, archived_at = null, updated_at = now();
  else
    update ic_chat.affiliate_profiles set active = false, commission_rate = p_commission_rate, updated_at = now() where affiliate_profiles.user_id = p_user_id;
  end if;
  return query select a.user_id, a.referral_code, a.commission_rate, a.active
    from ic_chat.affiliate_profiles a where a.user_id = p_user_id and a.archived_at is null;
end $$;
revoke all on function ic_chat.admin_set_affiliate(uuid, boolean, numeric) from public, anon;
grant execute on function ic_chat.admin_set_affiliate(uuid, boolean, numeric) to authenticated, service_role;

create or replace function ic_chat.admin_affiliate_overview()
returns table (
  user_id uuid, email text, display_name text, referral_code text, commission_rate numeric, active boolean,
  referrals bigint, active_subscriptions bigint, paid_revenue numeric, commission_pending numeric,
  commission_paid numeric, commission_reversed numeric, created_at timestamptz
) language plpgsql security definer set search_path = '' as $$
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select a.user_id, u.email::text, coalesce(m.display_name, u.email)::text, a.referral_code, a.commission_rate, a.active,
      coalesce(r.referrals, 0), coalesce(r.active_subscriptions, 0), coalesce(r.paid_revenue, 0),
      coalesce(c.pending, 0), coalesce(c.paid, 0), coalesce(c.reversed, 0), a.created_at
    from ic_chat.affiliate_profiles a
    join auth.users u on u.id = a.user_id
    left join lateral (select tm.display_name from ic_chat.tenant_members tm where tm.user_id = a.user_id order by (tm.role = 'owner') desc, tm.created_at limit 1) m on true
    left join lateral (
      select count(*)::bigint referrals,
        count(*) filter (where s.status = 'active' and coalesce(s.current_period_ends_at, 'infinity'::timestamptz) > now())::bigint active_subscriptions,
        coalesce((select sum(p.amount) from ic_chat.payments p join ic_chat.affiliate_referrals ar on ar.tenant_id = p.tenant_id where ar.affiliate_user_id = a.user_id and p.status = 'approved'), 0)::numeric paid_revenue
      from ic_chat.affiliate_referrals ar left join ic_chat.subscriptions s on s.tenant_id = ar.tenant_id
      where ar.affiliate_user_id = a.user_id
    ) r on true
    left join lateral (
      select coalesce(sum(ac.amount) filter (where ac.status = 'pending'), 0)::numeric pending,
        coalesce(sum(ac.amount) filter (where ac.status = 'paid'), 0)::numeric paid,
        coalesce(sum(ac.amount) filter (where ac.status = 'reversed'), 0)::numeric reversed
      from ic_chat.affiliate_commissions ac where ac.affiliate_user_id = a.user_id
    ) c on true
    where a.archived_at is null
    order by a.created_at desc;
end $$;
revoke all on function ic_chat.admin_affiliate_overview() from public, anon;
grant execute on function ic_chat.admin_affiliate_overview() to authenticated, service_role;

alter table ic_chat.plans
  add column if not exists discount_type text check (discount_type in ('percent', 'fixed')),
  add column if not exists discount_value numeric(10,2) not null default 0 check (discount_value >= 0),
  add column if not exists discount_label text not null default '',
  add column if not exists discount_ends_at timestamptz;

create table if not exists ic_chat.checkout_quotes (
  id uuid primary key,
  tenant_id uuid not null references ic_chat.tenants(id) on delete cascade,
  plan_id text not null references ic_chat.plans(id),
  amount numeric(10,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);
alter table ic_chat.checkout_quotes enable row level security;
revoke all on ic_chat.checkout_quotes from public, anon, authenticated;
grant all on ic_chat.checkout_quotes to service_role;

comment on column ic_chat.plans.discount_ends_at is 'Fim da oferta. NULL significa desconto permanente enquanto discount_type e discount_value estiverem configurados.';
comment on table ic_chat.checkout_quotes is 'Cópia do valor autorizado pelo checkout; o webhook valida o pagamento contra ela.';
