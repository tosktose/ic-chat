-- Evita a ambiguidade entre o OUT parameter user_id e a coluna usada no alvo do UPSERT.
create or replace function ic_chat.admin_set_affiliate(
  p_user_id uuid,
  p_enabled boolean,
  p_commission_rate numeric default 10
)
returns table (user_id uuid, referral_code text, commission_rate numeric, active boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if not ic_chat.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_commission_rate is null or p_commission_rate < 0 or p_commission_rate > 100 then
    raise exception 'invalid_commission_rate';
  end if;
  if not exists (
    select 1 from ic_chat.tenant_members m where m.user_id = p_user_id
  ) then
    raise exception 'user_not_found';
  end if;

  if p_enabled then
    insert into ic_chat.affiliate_profiles(user_id, referral_code, commission_rate, active)
    values (
      p_user_id,
      lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
      p_commission_rate,
      true
    )
    on conflict on constraint affiliate_profiles_pkey
    do update set commission_rate = excluded.commission_rate, active = true, updated_at = now();
  else
    update ic_chat.affiliate_profiles
       set active = false, commission_rate = p_commission_rate, updated_at = now()
     where affiliate_profiles.user_id = p_user_id;
  end if;

  return query
    select a.user_id, a.referral_code, a.commission_rate, a.active
      from ic_chat.affiliate_profiles a
     where a.user_id = p_user_id;
end
$$;

revoke all on function ic_chat.admin_set_affiliate(uuid, boolean, numeric) from public, anon;
grant execute on function ic_chat.admin_set_affiliate(uuid, boolean, numeric) to authenticated, service_role;
