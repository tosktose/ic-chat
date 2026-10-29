-- Integrações da plataforma (OpenRouter, Evolution API, n8n, Google) preenchidas pelo Super Admin.
-- Valores sensíveis ficam numa tabela que NINGUÉM lê pelo site: só as funções abaixo (Super Admin) e as
-- Edge Functions (service_role). O painel nunca recebe o valor de volta, só os 4 últimos caracteres.
create table if not exists ic_chat.platform_secrets (
  key text primary key check (key ~ '^[a-z0-9_]{3,40}$'),
  value text not null,
  secret boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table ic_chat.platform_secrets enable row level security;
revoke all on ic_chat.platform_secrets from public, anon, authenticated;
grant all on ic_chat.platform_secrets to service_role;

-- Chaves aceitas (qualquer outra é recusada)
create or replace function ic_chat.admin_set_integration(p_key text, p_value text)
returns void language plpgsql security definer set search_path = '' as $$
declare allowed text[] := array['openrouter_api_key','openrouter_model','openrouter_base_url','evolution_url','evolution_api_key','n8n_url','n8n_api_key','google_client_id','google_client_secret'];
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not (p_key = any(allowed)) then raise exception 'invalid_key'; end if;
  if p_value is null or length(trim(p_value)) = 0 then
    delete from ic_chat.platform_secrets where key = p_key;
  else
    if length(p_value) > 500 then raise exception 'value_too_long'; end if;
    insert into ic_chat.platform_secrets(key, value, secret) values (p_key, trim(p_value), p_key ~ '(api_key|secret)$')
      on conflict (key) do update set value = excluded.value, secret = excluded.secret, updated_at = now();
  end if;
end $$;

-- Estado de cada campo: preenchido? Valores públicos (URL, modelo) voltam inteiros; segredos só com final mascarado.
create or replace function ic_chat.admin_integrations()
returns table (key text, filled boolean, preview text, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not ic_chat.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select s.key, true,
    case when s.secret then '••••' || right(s.value, 4) else s.value end, s.updated_at
  from ic_chat.platform_secrets s order by s.key;
end $$;

revoke all on function ic_chat.admin_set_integration(text, text) from public, anon;
revoke all on function ic_chat.admin_integrations() from public, anon;
grant execute on function ic_chat.admin_set_integration(text, text) to authenticated, service_role;
grant execute on function ic_chat.admin_integrations() to authenticated, service_role;
