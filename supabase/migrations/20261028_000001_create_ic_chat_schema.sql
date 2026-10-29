-- IC Chat: schema isolado para não alterar as tabelas e aplicações existentes.
-- Depois de executar esta migration, adicione `ic_chat` a API > Exposed schemas
-- no Supabase. O acesso continua protegido por grants e RLS.
create schema if not exists ic_chat;
revoke all on schema ic_chat from public, anon;
grant usage on schema ic_chat to authenticated, service_role;

create table if not exists ic_chat.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ic_chat.tenant_members (
  tenant_id uuid not null references ic_chat.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'manager', 'agent')),
  display_name text,
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index if not exists tenant_members_user_idx on ic_chat.tenant_members(user_id);

create table if not exists ic_chat.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references ic_chat.tenants(id) on delete cascade,
  plan text not null default 'trial' check (plan in ('trial', 'start', 'pro', 'business')),
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  current_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ic_chat.contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ic_chat.tenants(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  phone text not null default '',
  email text,
  tags text[] not null default '{}',
  notes text,
  source text,
  campaign text,
  visits integer not null default 0 check (visits >= 0),
  spent numeric(14,2) not null default 0 check (spent >= 0),
  birthday date,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contacts_tenant_name_idx on ic_chat.contacts(tenant_id, name);
create index if not exists contacts_tenant_phone_idx on ic_chat.contacts(tenant_id, phone);

create table if not exists ic_chat.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ic_chat.tenants(id) on delete cascade,
  contact_id uuid not null,
  channel text not null default 'whatsapp',
  status text not null default 'nova' check (status in ('nova', 'ia', 'aguardando', 'humano', 'resolvida')),
  assigned_to uuid references auth.users(id) on delete set null,
  unread integer not null default 0 check (unread >= 0),
  last_message text not null default '',
  last_time text not null default '',
  ai_enabled boolean not null default true,
  tags text[] not null default '{}',
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, contact_id) references ic_chat.contacts(tenant_id, id) on delete cascade,
  unique (tenant_id, id),
  unique (tenant_id, contact_id, channel)
);
create index if not exists conversations_tenant_status_idx on ic_chat.conversations(tenant_id, status, updated_at desc);

create table if not exists ic_chat.messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ic_chat.tenants(id) on delete cascade,
  conversation_id uuid not null,
  sender_type text not null check (sender_type in ('contact', 'agent', 'ai', 'system')),
  kind text not null default 'text',
  content text not null default '',
  status text,
  provider_message_id text,
  sent_at timestamptz not null default now(),
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  foreign key (tenant_id, conversation_id) references ic_chat.conversations(tenant_id, id) on delete cascade
);
create index if not exists messages_conversation_time_idx on ic_chat.messages(tenant_id, conversation_id, sent_at);
create unique index if not exists messages_provider_id_idx on ic_chat.messages(tenant_id, provider_message_id) where provider_message_id is not null;

create table if not exists ic_chat.deals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ic_chat.tenants(id) on delete cascade,
  contact_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 160),
  amount numeric(14,2) not null default 0 check (amount >= 0),
  stage text not null default 'novo' check (stage in ('novo', 'qualificando', 'proposta', 'negociacao', 'ganho', 'perdido')),
  probability smallint not null default 25 check (probability between 0 and 100),
  owner_id uuid references auth.users(id) on delete set null,
  days_in_stage integer not null default 0 check (days_in_stage >= 0),
  next_action text,
  source text not null default 'Desconhecida',
  campaign text,
  lost_reason text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, contact_id) references ic_chat.contacts(tenant_id, id) on delete restrict
);
create index if not exists deals_tenant_stage_idx on ic_chat.deals(tenant_id, stage, updated_at desc);
create index if not exists deals_tenant_source_idx on ic_chat.deals(tenant_id, source);

create table if not exists ic_chat.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ic_chat.tenants(id) on delete cascade,
  contact_id uuid,
  professional_id uuid references auth.users(id) on delete set null,
  service_name text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmado',
  origin text not null default 'manual',
  amount numeric(14,2) not null default 0 check (amount >= 0),
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, contact_id) references ic_chat.contacts(tenant_id, id),
  check (ends_at > starts_at)
);
create index if not exists appointments_tenant_start_idx on ic_chat.appointments(tenant_id, starts_at);

create table if not exists ic_chat.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ic_chat.tenants(id) on delete cascade,
  contact_id uuid,
  deal_id uuid,
  assigned_to uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'done', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, contact_id) references ic_chat.contacts(tenant_id, id),
  foreign key (tenant_id, deal_id) references ic_chat.deals(tenant_id, id)
);
create index if not exists tasks_tenant_due_idx on ic_chat.tasks(tenant_id, status, due_at);

create table if not exists ic_chat.campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ic_chat.tenants(id) on delete cascade,
  name text not null,
  source text not null,
  medium text,
  external_id text,
  spend numeric(14,2) not null default 0 check (spend >= 0),
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ic_chat.channel_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ic_chat.tenants(id) on delete cascade,
  provider text not null check (provider in ('whatsapp', 'instagram', 'messenger', 'google')),
  display_name text not null default '',
  external_account_id text,
  status text not null default 'disconnected' check (status in ('disconnected', 'pending', 'connected', 'error')),
  secret_reference text,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider, external_account_id)
);

create table if not exists ic_chat.audit_events (
  id bigint generated always as identity primary key,
  tenant_id uuid references ic_chat.tenants(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function ic_chat.is_tenant_member(target_tenant uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from ic_chat.tenant_members m where m.tenant_id = target_tenant and m.user_id = (select auth.uid()))
$$;

create or replace function ic_chat.has_active_access(target_tenant uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from ic_chat.subscriptions s
    where s.tenant_id = target_tenant
      and ((s.status = 'trialing' and s.trial_ends_at > now()) or (s.status = 'active' and coalesce(s.current_period_ends_at, 'infinity'::timestamptz) > now()))
  )
$$;

create or replace function ic_chat.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end
$$;

-- Provisiona sob demanda usuários Auth que já existiam antes do IC Chat.
-- Repetir a chamada é seguro e cada usuário recebe somente uma empresa.
create or replace function ic_chat.ensure_tenant_for_current_user(requested_company text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := (select auth.uid()); created_tenant uuid; company_name text;
begin
  if current_user_id is null then raise exception 'Not authenticated'; end if;
  perform pg_advisory_xact_lock(hashtext(current_user_id::text));
  select m.tenant_id into created_tenant from ic_chat.tenant_members m where m.user_id = current_user_id limit 1;
  if created_tenant is not null then return created_tenant; end if;

  select coalesce(nullif(trim(requested_company), ''), nullif(trim(u.raw_user_meta_data ->> 'company_name'), ''), nullif(trim(u.raw_user_meta_data ->> 'name'), ''), nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'Minha empresa')
    into company_name from auth.users u where u.id = current_user_id;
  if length(trim(company_name)) < 2 then company_name := 'Minha empresa'; end if;
  insert into ic_chat.tenants(name) values (left(company_name, 120)) returning id into created_tenant;
  insert into ic_chat.tenant_members(tenant_id, user_id, role, display_name)
    select created_tenant, u.id, 'owner', coalesce(u.raw_user_meta_data ->> 'name', u.email) from auth.users u where u.id = current_user_id;
  insert into ic_chat.subscriptions(tenant_id, plan, status, trial_started_at, trial_ends_at)
    values (created_tenant, 'trial', 'trialing', now(), now() + interval '7 days');
  return created_tenant;
end
$$;

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
  return new;
end
$$;

drop trigger if exists on_auth_user_created_ic_chat on auth.users;
create trigger on_auth_user_created_ic_chat after insert on auth.users for each row execute function ic_chat.handle_new_user();

do $$
declare t text;
begin
  foreach t in array array['tenants','subscriptions','contacts','conversations','deals','appointments','tasks','campaigns','channel_connections'] loop
    execute format('drop trigger if exists touch_updated_at on ic_chat.%I', t);
    execute format('create trigger touch_updated_at before update on ic_chat.%I for each row execute function ic_chat.touch_updated_at()', t);
  end loop;
end $$;

revoke all on function ic_chat.is_tenant_member(uuid) from public, anon;
revoke all on function ic_chat.has_active_access(uuid) from public, anon;
revoke all on function ic_chat.ensure_tenant_for_current_user(text) from public, anon;
grant execute on function ic_chat.is_tenant_member(uuid) to authenticated, service_role;
grant execute on function ic_chat.has_active_access(uuid) to authenticated, service_role;
grant execute on function ic_chat.ensure_tenant_for_current_user(text) to authenticated, service_role;
revoke all on function ic_chat.handle_new_user() from public, anon, authenticated;
grant execute on function ic_chat.handle_new_user() to supabase_auth_admin, service_role;
revoke all on function ic_chat.touch_updated_at() from public, anon;
grant execute on function ic_chat.touch_updated_at() to authenticated, service_role;

do $$
declare t text;
begin
  foreach t in array array['tenants','tenant_members','subscriptions','contacts','conversations','messages','deals','appointments','tasks','campaigns','channel_connections','audit_events'] loop
    execute format('alter table ic_chat.%I enable row level security', t);
    execute format('revoke all on ic_chat.%I from anon, public', t);
    execute format('grant select, insert, update, delete on ic_chat.%I to authenticated', t);
  end loop;
end $$;
grant usage, select on all sequences in schema ic_chat to authenticated;
grant all on all tables in schema ic_chat to service_role;
grant usage, select on all sequences in schema ic_chat to service_role;

create policy tenant_members_select_self on ic_chat.tenant_members for select to authenticated using (user_id = (select auth.uid()));
create policy tenants_member_read on ic_chat.tenants for select to authenticated using (ic_chat.is_tenant_member(id));
create policy tenants_owner_update on ic_chat.tenants for update to authenticated using (exists(select 1 from ic_chat.tenant_members m where m.tenant_id=id and m.user_id=(select auth.uid()) and m.role='owner')) with check (exists(select 1 from ic_chat.tenant_members m where m.tenant_id=id and m.user_id=(select auth.uid()) and m.role='owner'));
create policy subscriptions_member_read on ic_chat.subscriptions for select to authenticated using (ic_chat.is_tenant_member(tenant_id));
revoke insert, update, delete on ic_chat.audit_events from authenticated;
create policy audit_events_member_read on ic_chat.audit_events for select to authenticated using (ic_chat.is_tenant_member(tenant_id) and ic_chat.has_active_access(tenant_id));

do $$
declare t text;
begin
  foreach t in array array['contacts','conversations','messages','deals','appointments','tasks','campaigns','channel_connections'] loop
    execute format('create policy tenant_scope_select on ic_chat.%I for select to authenticated using (ic_chat.is_tenant_member(tenant_id) and ic_chat.has_active_access(tenant_id))', t);
    execute format('create policy tenant_scope_insert on ic_chat.%I for insert to authenticated with check (ic_chat.is_tenant_member(tenant_id) and ic_chat.has_active_access(tenant_id))', t);
    execute format('create policy tenant_scope_update on ic_chat.%I for update to authenticated using (ic_chat.is_tenant_member(tenant_id) and ic_chat.has_active_access(tenant_id)) with check (ic_chat.is_tenant_member(tenant_id) and ic_chat.has_active_access(tenant_id))', t);
    execute format('create policy tenant_scope_delete on ic_chat.%I for delete to authenticated using (ic_chat.is_tenant_member(tenant_id) and ic_chat.has_active_access(tenant_id))', t);
  end loop;
end $$;

comment on schema ic_chat is 'IC Chat application data; isolated from existing project schemas.';
comment on table ic_chat.subscriptions is 'Every new account starts a seven-day trial; access is enforced by has_active_access and RLS.';
