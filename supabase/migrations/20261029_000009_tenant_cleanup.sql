-- Execute depois da 000006 (afiliados): esta versão do gatilho mantém a atribuição de afiliado.
-- Limpeza de empresas e fim das empresas "fantasma".
-- O banco é compartilhado com outros sistemas (porteiro, síndico...). O gatilho antigo criava uma empresa
-- do IC Chat para QUALQUER pessoa que se cadastrasse em qualquer um deles. Agora só cria quando o
-- cadastro vem do IC Chat (metadata app = 'icchat'). Quem já existe em outro sistema ganha a empresa
-- sozinho no primeiro login no IC Chat (ensure_tenant_for_current_user), como já acontece.

create or replace function ic_chat.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare created_tenant uuid; company_name text;
begin
  if coalesce(new.raw_user_meta_data ->> 'app', '') <> 'icchat' then return new; end if;
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

-- Exclui uma empresa do IC Chat (e só dela: o usuário continua existindo nos outros sistemas).
-- Recusa se a empresa tiver mensalidade ativa, pagamento aprovado ou conversas — para isso é preciso
-- passar p_force = true de propósito. Nunca exclui a empresa de quem está executando.
create or replace function ic_chat.admin_delete_tenant(p_tenant uuid, p_force boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare busy text;
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if exists (select 1 from ic_chat.tenant_members where tenant_id = p_tenant and user_id = auth.uid()) then
    raise exception 'own_tenant';
  end if;
  if not exists (select 1 from ic_chat.tenants where id = p_tenant) then raise exception 'tenant_not_found'; end if;
  if not p_force then
    select case
      when exists (select 1 from ic_chat.subscriptions where tenant_id = p_tenant and status = 'active') then 'active_subscription'
      when exists (select 1 from ic_chat.payments where tenant_id = p_tenant and status = 'approved') then 'has_payments'
      when exists (select 1 from ic_chat.conversations where tenant_id = p_tenant) then 'has_conversations'
    end into busy;
    if busy is not null then raise exception '%', busy; end if;
  end if;
  delete from ic_chat.tenants where id = p_tenant;
end $$;

revoke all on function ic_chat.admin_delete_tenant(uuid, boolean) from public, anon;
grant execute on function ic_chat.admin_delete_tenant(uuid, boolean) to authenticated, service_role;
