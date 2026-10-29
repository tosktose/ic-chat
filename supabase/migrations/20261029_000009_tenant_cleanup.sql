-- Execute depois da 000006 (afiliados): esta versão do gatilho mantém a atribuição de afiliado.
-- Empresas ocultas e fim das empresas "fantasma" (nada é excluído).
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

-- Ocultar uma empresa SÓ no painel do IC Chat. Nada é apagado: nem o usuário (auth.users), nem os dados
-- dos outros sistemas que usam este banco, nem a empresa em si. Dá para desfazer a qualquer momento.
create table if not exists ic_chat.hidden_tenants (
  tenant_id uuid primary key references ic_chat.tenants(id) on delete cascade,
  hidden_at timestamptz not null default now()
);
alter table ic_chat.hidden_tenants enable row level security;
revoke all on ic_chat.hidden_tenants from public, anon, authenticated;
grant all on ic_chat.hidden_tenants to service_role;

create or replace function ic_chat.admin_set_tenant_hidden(p_tenant uuid, p_hidden boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from ic_chat.tenants where id = p_tenant) then raise exception 'tenant_not_found'; end if;
  if p_hidden then
    if exists (select 1 from ic_chat.tenant_members where tenant_id = p_tenant and user_id = auth.uid()) then raise exception 'own_tenant'; end if;
    insert into ic_chat.hidden_tenants(tenant_id) values (p_tenant) on conflict do nothing;
  else
    delete from ic_chat.hidden_tenants where tenant_id = p_tenant;
  end if;
end $$;

create or replace function ic_chat.admin_hidden_tenants()
returns setof uuid language plpgsql security definer set search_path = '' as $$
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select tenant_id from ic_chat.hidden_tenants;
end $$;

revoke all on function ic_chat.admin_set_tenant_hidden(uuid, boolean) from public, anon;
revoke all on function ic_chat.admin_hidden_tenants() from public, anon;
grant execute on function ic_chat.admin_set_tenant_hidden(uuid, boolean) to authenticated, service_role;
grant execute on function ic_chat.admin_hidden_tenants() to authenticated, service_role;
