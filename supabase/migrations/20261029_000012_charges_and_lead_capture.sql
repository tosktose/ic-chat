-- Cobranças do cliente final e formulário público de captação (link na bio).
-- Só cria objetos novos no schema ic_chat. Não apaga nem altera dados existentes.

create table if not exists ic_chat.charges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ic_chat.tenants(id) on delete cascade,
  contact_id uuid,
  customer_name text not null check (length(trim(customer_name)) between 1 and 160),
  customer_phone text not null default '',
  description text not null default '',
  amount numeric(14,2) not null check (amount > 0),
  due_date date,
  method text not null default 'pix' check (method in ('pix', 'boleto', 'cartao', 'dinheiro', 'outro')),
  pay_link text,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists charges_tenant_status_idx on ic_chat.charges(tenant_id, status, due_date);

alter table ic_chat.charges enable row level security;
revoke all on ic_chat.charges from anon, public;
grant select, insert, update, delete on ic_chat.charges to authenticated;
grant all on ic_chat.charges to service_role;

drop policy if exists tenant_scope_select on ic_chat.charges;
drop policy if exists tenant_scope_insert on ic_chat.charges;
drop policy if exists tenant_scope_update on ic_chat.charges;
drop policy if exists tenant_scope_delete on ic_chat.charges;
create policy tenant_scope_select on ic_chat.charges for select to authenticated using (ic_chat.is_tenant_member(tenant_id) and ic_chat.has_active_access(tenant_id));
create policy tenant_scope_insert on ic_chat.charges for insert to authenticated with check (ic_chat.is_tenant_member(tenant_id) and ic_chat.has_active_access(tenant_id));
create policy tenant_scope_update on ic_chat.charges for update to authenticated using (ic_chat.is_tenant_member(tenant_id) and ic_chat.has_active_access(tenant_id)) with check (ic_chat.is_tenant_member(tenant_id) and ic_chat.has_active_access(tenant_id));
create policy tenant_scope_delete on ic_chat.charges for delete to authenticated using (ic_chat.is_tenant_member(tenant_id) and ic_chat.has_active_access(tenant_id));

-- Nome público da empresa para a página de captação (não expõe mais nada).
create or replace function ic_chat.capture_page_info(p_tenant uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select t.name from ic_chat.tenants t where t.id = p_tenant;
$$;

-- Formulário público: cria (ou reaproveita) o contato e abre uma conversa nova no funil da empresa.
create or replace function ic_chat.capture_lead(p_tenant uuid, p_name text, p_phone text, p_message text default '', p_source text default 'link-na-bio')
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := left(trim(coalesce(p_name, '')), 160);
  v_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_msg text := left(trim(coalesce(p_message, '')), 1000);
  v_contact uuid;
  v_conv uuid;
begin
  if length(v_name) < 2 or length(v_digits) < 10 or length(v_digits) > 15 then
    return false;
  end if;
  if not exists (select 1 from ic_chat.tenants t where t.id = p_tenant) or not ic_chat.has_active_access(p_tenant) then
    return false;
  end if;

  select c.id into v_contact from ic_chat.contacts c
   where c.tenant_id = p_tenant and regexp_replace(c.phone, '\D', '', 'g') = v_digits limit 1;
  if v_contact is null then
    insert into ic_chat.contacts(tenant_id, name, phone, source, tags)
    values (p_tenant, v_name, v_digits, left(coalesce(p_source, 'link-na-bio'), 60), array['Novo lead'])
    returning id into v_contact;
  end if;

  insert into ic_chat.conversations(tenant_id, contact_id, channel, status, unread, last_message, last_time, extra)
  values (p_tenant, v_contact, 'whatsapp', 'nova', 1, coalesce(nullif(v_msg, ''), 'Novo contato pelo formulário'), to_char(now() at time zone 'America/Sao_Paulo', 'HH24:MI'),
          jsonb_build_object('createdAt', (extract(epoch from now()) * 1000)::bigint, 'kanbanStage', 'nova'))
  on conflict (tenant_id, contact_id, channel) do update
    set unread = ic_chat.conversations.unread + 1,
        last_message = excluded.last_message,
        updated_at = now()
  returning id into v_conv;

  insert into ic_chat.messages(tenant_id, conversation_id, sender_type, kind, content)
  values (p_tenant, v_conv, 'contact', 'text', coalesce(nullif(v_msg, ''), 'Novo contato pelo formulário de captação.'));
  return true;
end;
$$;

revoke all on function ic_chat.capture_page_info(uuid) from public;
revoke all on function ic_chat.capture_lead(uuid, text, text, text, text) from public;
grant execute on function ic_chat.capture_page_info(uuid) to anon, authenticated, service_role;
grant execute on function ic_chat.capture_lead(uuid, text, text, text, text) to anon, authenticated, service_role;
