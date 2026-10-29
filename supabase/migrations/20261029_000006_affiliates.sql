-- IC Chat: afiliados, atribuição de novas empresas e comissões por pagamento aprovado.
-- Execute depois das migrations 000001 a 000005.

create table if not exists ic_chat.affiliate_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  referral_code text not null unique,
  commission_rate numeric(5,2) not null default 10 check (commission_rate between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ic_chat.affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid not null references ic_chat.affiliate_profiles(user_id) on delete restrict,
  tenant_id uuid not null unique references ic_chat.tenants(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  referral_code text not null,
  created_at timestamptz not null default now()
);
create index if not exists affiliate_referrals_affiliate_idx on ic_chat.affiliate_referrals(affiliate_user_id, created_at desc);

create table if not exists ic_chat.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid not null references ic_chat.affiliate_profiles(user_id) on delete restrict,
  referral_id uuid not null references ic_chat.affiliate_referrals(id) on delete cascade,
  tenant_id uuid not null references ic_chat.tenants(id) on delete cascade,
  payment_id uuid not null unique references ic_chat.payments(id) on delete cascade,
  commission_rate numeric(5,2) not null check (commission_rate between 0 and 100),
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'reversed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists affiliate_commissions_affiliate_idx on ic_chat.affiliate_commissions(affiliate_user_id, created_at desc);

-- Dados financeiros e de atribuição só são acessados pelas funções controladas abaixo.
alter table ic_chat.affiliate_profiles enable row level security;
alter table ic_chat.affiliate_referrals enable row level security;
alter table ic_chat.affiliate_commissions enable row level security;
revoke all on ic_chat.affiliate_profiles, ic_chat.affiliate_referrals, ic_chat.affiliate_commissions from public, anon, authenticated;
grant all on ic_chat.affiliate_profiles, ic_chat.affiliate_referrals, ic_chat.affiliate_commissions to service_role;

create or replace function ic_chat.attach_affiliate_referral(p_tenant uuid, p_user uuid, p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare affiliate_id uuid; clean_code text := upper(trim(coalesce(p_code, '')));
begin
  if clean_code = '' or p_tenant is null or p_user is null then return; end if;
  select a.user_id into affiliate_id from ic_chat.affiliate_profiles a
   where upper(a.referral_code) = clean_code and a.active;
  if affiliate_id is null or affiliate_id = p_user then return; end if;
  insert into ic_chat.affiliate_referrals(affiliate_user_id, tenant_id, referred_user_id, referral_code)
    values (affiliate_id, p_tenant, p_user, clean_code)
    on conflict (tenant_id) do nothing;
end $$;
revoke all on function ic_chat.attach_affiliate_referral(uuid, uuid, text) from public, anon, authenticated;
grant execute on function ic_chat.attach_affiliate_referral(uuid, uuid, text) to supabase_auth_admin, service_role;

-- Captura indicação no cadastro por e-mail/senha. O código vem de user_metadata,
-- enviado pela aplicação antes do usuário ser criado pelo Supabase Auth.
create or replace function ic_chat.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare created_tenant uuid; company_name text;
begin
  company_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'company_name'), ''), nullif(trim(new.raw_user_meta_data ->> 'name'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Minha empresa');
  if length(trim(company_name)) < 2 then company_name := 'Minha empresa'; end if;
  insert into ic_chat.tenants(name) values (left(company_name, 120)) returning id into created_tenant;
  insert into ic_chat.tenant_members(tenant_id, user_id, role, display_name)
    values (created_tenant, new.id, 'owner', coalesce(new.raw_user_meta_data ->> 'name', new.email));
  insert into ic_chat.subscriptions(tenant_id, plan, status, trial_started_at, trial_ends_at)
    values (created_tenant, 'trial', 'trialing', now(), now() + interval '7 days');
  perform ic_chat.attach_affiliate_referral(created_tenant, new.id, new.raw_user_meta_data ->> 'affiliate_referral_code');
  return new;
end
$$;
revoke all on function ic_chat.handle_new_user() from public, anon, authenticated;
grant execute on function ic_chat.handle_new_user() to supabase_auth_admin, service_role;

-- Fallback para novos cadastros Google OAuth: só permite atribuir uma conta recém-criada,
-- pela empresa cujo dono é o usuário autenticado, e mantém a atribuição única por empresa.
create or replace function ic_chat.claim_affiliate_referral(p_code text, p_started_at timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := (select auth.uid()); current_tenant uuid; tenant_created timestamptz; attached_before boolean;
begin
  if current_user_id is null then raise exception 'Not authenticated'; end if;
  if p_started_at is null or p_started_at < now() - interval '30 minutes' or p_started_at > now() + interval '1 minute' then return false; end if;
  select m.tenant_id, t.created_at into current_tenant, tenant_created
    from ic_chat.tenant_members m join ic_chat.tenants t on t.id = m.tenant_id
   where m.user_id = current_user_id and m.role = 'owner' order by m.created_at limit 1;
  if current_tenant is null or tenant_created < p_started_at - interval '1 minute' then return false; end if;
  select exists(select 1 from ic_chat.affiliate_referrals r where r.tenant_id = current_tenant) into attached_before;
  if attached_before then return false; end if;
  perform ic_chat.attach_affiliate_referral(current_tenant, current_user_id, p_code);
  return exists(select 1 from ic_chat.affiliate_referrals r where r.tenant_id = current_tenant);
end $$;
revoke all on function ic_chat.claim_affiliate_referral(text, timestamptz) from public, anon;
grant execute on function ic_chat.claim_affiliate_referral(text, timestamptz) to authenticated, service_role;

create or replace function ic_chat.admin_set_affiliate(p_user_id uuid, p_enabled boolean, p_commission_rate numeric default 10)
returns table (user_id uuid, referral_code text, commission_rate numeric, active boolean)
language plpgsql security definer set search_path = '' as $$
declare code text;
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_commission_rate is null or p_commission_rate < 0 or p_commission_rate > 100 then raise exception 'invalid_commission_rate'; end if;
  if not exists(select 1 from ic_chat.tenant_members m where m.user_id = p_user_id) then raise exception 'user_not_found'; end if;
  if p_enabled then
    insert into ic_chat.affiliate_profiles(user_id, referral_code, commission_rate, active)
      values (p_user_id, lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), p_commission_rate, true)
      on conflict on constraint affiliate_profiles_pkey do update set commission_rate = excluded.commission_rate, active = true, updated_at = now();
  else
    update ic_chat.affiliate_profiles set active = false, commission_rate = p_commission_rate, updated_at = now() where affiliate_profiles.user_id = p_user_id;
  end if;
  return query select a.user_id, a.referral_code, a.commission_rate, a.active
    from ic_chat.affiliate_profiles a where a.user_id = p_user_id;
end $$;
revoke all on function ic_chat.admin_set_affiliate(uuid, boolean, numeric) from public, anon;
grant execute on function ic_chat.admin_set_affiliate(uuid, boolean, numeric) to authenticated, service_role;

drop function if exists ic_chat.admin_members();
create function ic_chat.admin_members()
returns table (
  user_id uuid, email text, display_name text, role text, tenant_id uuid, tenant_name text,
  origin_role text, last_sign_in_at timestamptz, created_at timestamptz,
  affiliate_active boolean, affiliate_code text, affiliate_commission_rate numeric
) language plpgsql security definer set search_path = '' as $$
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select m.user_id, u.email::text, m.display_name, m.role, t.id, t.name,
           (u.raw_user_meta_data ->> 'role')::text, u.last_sign_in_at, m.created_at,
           coalesce(a.active, false), a.referral_code, a.commission_rate
      from ic_chat.tenant_members m
      join ic_chat.tenants t on t.id = m.tenant_id
      join auth.users u on u.id = m.user_id
      left join ic_chat.affiliate_profiles a on a.user_id = m.user_id
     order by m.created_at desc;
end $$;
revoke all on function ic_chat.admin_members() from public, anon;
grant execute on function ic_chat.admin_members() to authenticated, service_role;

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
    order by a.created_at desc;
end $$;
revoke all on function ic_chat.admin_affiliate_overview() from public, anon;
grant execute on function ic_chat.admin_affiliate_overview() to authenticated, service_role;

create or replace function ic_chat.admin_affiliate_referrals()
returns table (
  commission_id uuid, affiliate_user_id uuid, affiliate_email text, tenant_id uuid, tenant_name text, owner_email text,
  plan text, subscription_status text, referred_at timestamptz, payment_amount numeric, commission_amount numeric,
  paid_revenue numeric,
  commission_pending numeric, commission_paid numeric, commission_status text
) language plpgsql security definer set search_path = '' as $$
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select c.id, r.affiliate_user_id, au.email::text, t.id, t.name, owner.email::text,
      s.plan, s.status, r.created_at,
      coalesce(p.amount, 0)::numeric, coalesce(c.amount, 0)::numeric, coalesce(pay.total, 0)::numeric,
      case when c.status = 'pending' then c.amount else 0 end::numeric,
      case when c.status = 'paid' then c.amount else 0 end::numeric,
      c.status
    from ic_chat.affiliate_referrals r
    join ic_chat.affiliate_profiles a on a.user_id = r.affiliate_user_id
    join auth.users au on au.id = r.affiliate_user_id
    join ic_chat.tenants t on t.id = r.tenant_id
    left join lateral (select u.email from ic_chat.tenant_members tm join auth.users u on u.id=tm.user_id where tm.tenant_id=t.id order by (tm.role='owner') desc, tm.created_at limit 1) owner on true
    left join ic_chat.subscriptions s on s.tenant_id=t.id
    left join lateral (select sum(p.amount) total from ic_chat.payments p where p.tenant_id=t.id and p.status='approved') pay on true
    left join ic_chat.affiliate_commissions c on c.referral_id = r.id
    left join ic_chat.payments p on p.id = c.payment_id
    order by r.created_at desc;
end $$;
revoke all on function ic_chat.admin_affiliate_referrals() from public, anon;
grant execute on function ic_chat.admin_affiliate_referrals() to authenticated, service_role;

create or replace function ic_chat.admin_mark_affiliate_commissions_paid(p_commission_ids uuid[])
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(cardinality(p_commission_ids), 0) = 0 then raise exception 'commission_ids_required'; end if;
  update ic_chat.affiliate_commissions set status = 'paid', paid_at = now()
   where id = any(p_commission_ids) and status = 'pending';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function ic_chat.admin_mark_affiliate_commissions_paid(uuid[]) from public, anon;
grant execute on function ic_chat.admin_mark_affiliate_commissions_paid(uuid[]) to authenticated, service_role;

create or replace function ic_chat.my_affiliate_dashboard()
returns table (
  referral_code text, commission_rate numeric, referrals bigint, active_subscriptions bigint,
  paid_revenue numeric, commission_pending numeric, commission_paid numeric, commission_reversed numeric
) language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then raise exception 'Not authenticated'; end if;
  if not exists(select 1 from ic_chat.affiliate_profiles a where a.user_id=current_user_id and a.active) then raise exception 'affiliate_not_active' using errcode='42501'; end if;
  return query
    select a.referral_code, a.commission_rate, coalesce(r.referrals,0), coalesce(r.active_subscriptions,0), coalesce(r.paid_revenue,0),
      coalesce(c.pending,0), coalesce(c.paid,0), coalesce(c.reversed,0)
    from ic_chat.affiliate_profiles a
    left join lateral (
      select count(*)::bigint referrals,
        count(*) filter(where s.status='active' and coalesce(s.current_period_ends_at,'infinity'::timestamptz)>now())::bigint active_subscriptions,
        coalesce((select sum(p.amount) from ic_chat.payments p join ic_chat.affiliate_referrals ar2 on ar2.tenant_id=p.tenant_id where ar2.affiliate_user_id=a.user_id and p.status='approved'),0)::numeric paid_revenue
      from ic_chat.affiliate_referrals ar left join ic_chat.subscriptions s on s.tenant_id=ar.tenant_id where ar.affiliate_user_id=a.user_id
    ) r on true
    left join lateral (
      select coalesce(sum(ac.amount) filter(where ac.status='pending'),0)::numeric pending,
        coalesce(sum(ac.amount) filter(where ac.status='paid'),0)::numeric paid,
        coalesce(sum(ac.amount) filter(where ac.status='reversed'),0)::numeric reversed
      from ic_chat.affiliate_commissions ac where ac.affiliate_user_id=a.user_id
    ) c on true where a.user_id=current_user_id and a.active;
end $$;
revoke all on function ic_chat.my_affiliate_dashboard() from public, anon;
grant execute on function ic_chat.my_affiliate_dashboard() to authenticated, service_role;

create or replace function ic_chat.my_affiliate_referrals()
returns table (
  tenant_id uuid, tenant_name text, plan text, subscription_status text,
  referred_at timestamptz, paid_revenue numeric, commission_pending numeric, commission_paid numeric
) language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then raise exception 'Not authenticated'; end if;
  if not exists(select 1 from ic_chat.affiliate_profiles a where a.user_id=current_user_id and a.active) then raise exception 'affiliate_not_active' using errcode='42501'; end if;
  return query
    select t.id, t.name, s.plan, s.status, r.created_at,
      coalesce(pay.total,0)::numeric, coalesce(comm.pending,0)::numeric, coalesce(comm.paid,0)::numeric
    from ic_chat.affiliate_referrals r join ic_chat.tenants t on t.id=r.tenant_id
    left join ic_chat.subscriptions s on s.tenant_id=t.id
    left join lateral (select sum(p.amount) total from ic_chat.payments p where p.tenant_id=t.id and p.status='approved') pay on true
    left join lateral (select sum(c.amount) filter(where c.status='pending') pending,sum(c.amount) filter(where c.status='paid') paid from ic_chat.affiliate_commissions c where c.tenant_id=t.id and c.affiliate_user_id=current_user_id) comm on true
    where r.affiliate_user_id=current_user_id order by r.created_at desc;
end $$;
revoke all on function ic_chat.my_affiliate_referrals() from public, anon;
grant execute on function ic_chat.my_affiliate_referrals() to authenticated, service_role;

-- Atribui comissão idempotente em cada pagamento de plano aprovado; estornos revertem o saldo.
create or replace function ic_chat.apply_payment(
  p_tenant uuid, p_plan text, p_days int, p_provider_payment_id text, p_amount numeric, p_status text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare pay ic_chat.payments%rowtype; base timestamptz; referral ic_chat.affiliate_referrals%rowtype; rate numeric;
begin
  if not exists (select 1 from ic_chat.tenants where id = p_tenant) then raise exception 'tenant_not_found'; end if;
  insert into ic_chat.payments(tenant_id, provider_payment_id, plan, amount, days, status)
    values (p_tenant, p_provider_payment_id, p_plan, p_amount, p_days, p_status)
    on conflict (provider, provider_payment_id) do update set status = excluded.status, updated_at = now()
    returning * into pay;

  if p_status = 'approved' and pay.paid_at is null then
    update ic_chat.payments set paid_at = now() where id = pay.id;
    select greatest(now(), coalesce(s.current_period_ends_at, now())) into base from ic_chat.subscriptions s where s.tenant_id = p_tenant;
    update ic_chat.subscriptions set plan = p_plan, status = 'active', current_period_ends_at = coalesce(base, now()) + make_interval(days => p_days) where tenant_id = p_tenant;
    update ic_chat.licenses set expires_at = greatest(expires_at, now()) + make_interval(days => p_days), status = 'ativa', revoked_at = null where tenant_id = p_tenant and status in ('ativa', 'suspensa');

    select r.* into referral from ic_chat.affiliate_referrals r join ic_chat.affiliate_profiles a on a.user_id=r.affiliate_user_id
      where r.tenant_id=p_tenant and a.active;
    if referral.id is not null then
      select a.commission_rate into rate from ic_chat.affiliate_profiles a where a.user_id=referral.affiliate_user_id;
      insert into ic_chat.affiliate_commissions(affiliate_user_id, referral_id, tenant_id, payment_id, commission_rate, amount)
        values (referral.affiliate_user_id, referral.id, p_tenant, pay.id, rate, round(p_amount * rate / 100, 2))
        on conflict (payment_id) do nothing;
    end if;
    return jsonb_build_object('applied', true, 'action', 'activated');
  end if;

  if p_status in ('refunded', 'charged_back') and pay.paid_at is not null then
    update ic_chat.subscriptions set status = 'past_due' where tenant_id = p_tenant;
    update ic_chat.licenses set status = 'suspensa' where tenant_id = p_tenant and status = 'ativa';
    update ic_chat.affiliate_commissions set status = 'reversed' where payment_id = pay.id and status = 'pending';
    return jsonb_build_object('applied', true, 'action', 'suspended');
  end if;
  return jsonb_build_object('applied', false);
end $$;
revoke all on function ic_chat.apply_payment(uuid, text, int, text, numeric, text) from public, anon, authenticated;
grant execute on function ic_chat.apply_payment(uuid, text, int, text, numeric, text) to service_role;

comment on table ic_chat.affiliate_profiles is 'Perfis de afiliado aprovados e gerenciados pelo Super Admin.';
comment on table ic_chat.affiliate_referrals is 'Atribuição imutável da empresa ao primeiro link de afiliado usado no cadastro.';
comment on table ic_chat.affiliate_commissions is 'Comissões de pagamentos de assinatura; status paid é confirmação manual do repasse externo.';
