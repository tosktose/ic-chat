-- Agendamento online: página pública /agendar/:empresa
-- Só funções SECURITY DEFINER com retorno mínimo (nenhum dado de cliente sai daqui).
-- Fica ligado apenas quando a empresa ativa em Configurações → Automações (company_settings.data.automations.booking.enabled).

create or replace function ic_chat.booking_settings(p_tenant uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select cs.data from ic_chat.company_settings cs
   where cs.tenant_id = p_tenant
     and coalesce((cs.data #>> '{automations,booking,enabled}')::boolean, false)
     and ic_chat.has_active_access(p_tenant);
$$;

-- Dados da página: nome, aviso, horário de funcionamento, serviços e profissionais ativos
create or replace function ic_chat.booking_page_info(p_tenant uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  d jsonb := ic_chat.booking_settings(p_tenant);
  v_name text;
begin
  if d is null then return null; end if;
  select coalesce(nullif(d #>> '{info,name}', ''), t.name) into v_name from ic_chat.tenants t where t.id = p_tenant;
  return jsonb_build_object(
    'name', v_name,
    'address', coalesce(d #>> '{info,address}', ''),
    'note', left(coalesce(d #>> '{automations,booking,note}', ''), 300),
    'daysAhead', least(greatest(coalesce((d #>> '{automations,booking,daysAhead}')::int, 30), 1), 90),
    'hours', coalesce(d #> '{info,hours}', '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object('id', s->>'id', 'name', s->>'name', 'minutes', (s->>'minutes')::int, 'price', (s->>'price')::numeric, 'deposit', coalesce((s->>'deposit')::numeric, 0)))
        from jsonb_array_elements(coalesce(d->'services', '[]'::jsonb)) s
       where coalesce((s->>'minutes')::int, 0) >= 5
    ), '[]'::jsonb),
    'professionals', coalesce((
      select jsonb_agg(jsonb_build_object('id', p->>'id', 'name', p->>'name', 'specialty', coalesce(p->>'specialty', ''), 'serviceIds', coalesce(p->'serviceIds', '[]'::jsonb)))
        from jsonb_array_elements(coalesce(d->'professionals', '[]'::jsonb)) p
       where coalesce((p->>'active')::boolean, true)
    ), '[]'::jsonb)
  );
end;
$$;

-- Horários ocupados (só início e fim, por profissional), no fuso de Brasília
create or replace function ic_chat.booking_busy(p_tenant uuid, p_from date, p_to date)
returns table(professional_id text, day text, start_time text, end_time text)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(a.extra->>'professionalId', a.professional_id::text, ''),
         to_char(a.starts_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD'),
         to_char(a.starts_at at time zone 'America/Sao_Paulo', 'HH24:MI'),
         to_char(a.ends_at at time zone 'America/Sao_Paulo', 'HH24:MI')
    from ic_chat.appointments a
   where ic_chat.booking_settings(p_tenant) is not null
     and a.tenant_id = p_tenant
     and a.status not in ('cancelado', 'faltou')
     and p_to >= p_from and p_to - p_from <= 31
     and a.starts_at >= (p_from::timestamp at time zone 'America/Sao_Paulo')
     and a.starts_at < ((p_to + 1)::timestamp at time zone 'America/Sao_Paulo');
$$;

-- Marca o horário: confere serviço, profissional, expediente, almoço, prazo e choque de horário
create or replace function ic_chat.book_appointment(
  p_tenant uuid, p_service_id text, p_professional_id text, p_date date, p_start text, p_name text, p_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  d jsonb := ic_chat.booking_settings(p_tenant);
  v_name text := left(trim(coalesce(p_name, '')), 160);
  v_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_service jsonb;
  v_pro jsonb;
  v_minutes int;
  v_price numeric;
  v_start time;
  v_end time;
  v_starts timestamptz;
  v_ends timestamptz;
  v_day jsonb;
  v_days_ahead int;
  v_contact uuid;
  v_conv uuid;
  v_id uuid := gen_random_uuid();
  v_when text;
begin
  if d is null then return jsonb_build_object('ok', false, 'error', 'indisponivel'); end if;
  if length(v_name) < 2 or length(v_digits) < 10 or length(v_digits) > 13 then
    return jsonb_build_object('ok', false, 'error', 'dados');
  end if;
  if p_start !~ '^\d{2}:\d{2}$' then return jsonb_build_object('ok', false, 'error', 'horario'); end if;

  select s into v_service from jsonb_array_elements(coalesce(d->'services', '[]'::jsonb)) s where s->>'id' = p_service_id limit 1;
  select p into v_pro from jsonb_array_elements(coalesce(d->'professionals', '[]'::jsonb)) p
   where p->>'id' = p_professional_id and coalesce((p->>'active')::boolean, true) limit 1;
  if v_service is null or v_pro is null then return jsonb_build_object('ok', false, 'error', 'servico'); end if;
  if jsonb_array_length(coalesce(v_pro->'serviceIds', '[]'::jsonb)) > 0 and not (v_pro->'serviceIds') ? p_service_id then
    return jsonb_build_object('ok', false, 'error', 'servico');
  end if;

  v_minutes := greatest(coalesce((v_service->>'minutes')::int, 0), 5);
  v_price := coalesce((v_service->>'price')::numeric, 0);
  v_start := p_start::time;
  if v_start + make_interval(mins => v_minutes) < v_start then return jsonb_build_object('ok', false, 'error', 'horario'); end if;
  v_end := v_start + make_interval(mins => v_minutes);
  v_starts := (p_date + v_start) at time zone 'America/Sao_Paulo';
  v_ends := v_starts + make_interval(mins => v_minutes);

  -- Prazo: a partir de 1 hora de agora até N dias
  v_days_ahead := least(greatest(coalesce((d #>> '{automations,booking,daysAhead}')::int, 30), 1), 90);
  if v_starts < now() + interval '1 hour' or v_starts > now() + make_interval(days => v_days_ahead + 1) then
    return jsonb_build_object('ok', false, 'error', 'prazo');
  end if;

  -- Expediente do dia (0 = domingo) e almoço
  v_day := d #> array['info', 'hours', extract(dow from p_date)::int::text];
  if v_day is null or not coalesce((v_day->>'open')::boolean, false)
     or v_start < (v_day->>'start')::time or v_end > (v_day->>'end')::time then
    return jsonb_build_object('ok', false, 'error', 'fechado');
  end if;
  if coalesce(v_day->>'lunchStart', '') <> '' and coalesce(v_day->>'lunchEnd', '') <> ''
     and v_start < (v_day->>'lunchEnd')::time and v_end > (v_day->>'lunchStart')::time then
    return jsonb_build_object('ok', false, 'error', 'fechado');
  end if;

  -- Uma marcação por vez por profissional (evita dois clientes no mesmo horário)
  perform pg_advisory_xact_lock(hashtext(p_tenant::text || ':' || p_professional_id));
  if exists (
    select 1 from ic_chat.appointments a
     where a.tenant_id = p_tenant
       and coalesce(a.extra->>'professionalId', a.professional_id::text, '') = p_professional_id
       and a.status not in ('cancelado', 'faltou')
       and a.starts_at < v_ends and a.ends_at > v_starts
  ) then
    return jsonb_build_object('ok', false, 'error', 'ocupado');
  end if;

  -- Limite contra abuso: até 3 marcações pelo link por celular por dia
  if (select count(*) from ic_chat.appointments a
       where a.tenant_id = p_tenant and a.origin = 'link' and a.created_at > now() - interval '1 day'
         and a.extra->>'bookedPhone' = v_digits) >= 3 then
    return jsonb_build_object('ok', false, 'error', 'limite');
  end if;

  select c.id into v_contact from ic_chat.contacts c
   where c.tenant_id = p_tenant and right(regexp_replace(c.phone, '\D', '', 'g'), 11) = right(v_digits, 11) limit 1;
  if v_contact is null then
    insert into ic_chat.contacts(tenant_id, name, phone, source, tags)
    values (p_tenant, v_name, v_digits, 'agendamento-online', array['Agendou online'])
    returning id into v_contact;
  end if;

  insert into ic_chat.appointments(id, tenant_id, contact_id, professional_id, service_name, starts_at, ends_at, status, origin, amount, extra)
  values (v_id, p_tenant, v_contact, null, v_service->>'name', v_starts, v_ends, 'agendado', 'link', v_price,
          jsonb_build_object(
            'professionalId', p_professional_id, 'service', v_service->>'name', 'date', p_date::text,
            'start', to_char(v_start, 'HH24:MI'), 'end', to_char(v_end, 'HH24:MI'), 'status', 'agendado', 'origin', 'link',
            'price', v_price, 'contactId', v_contact::text, 'createdAt', (extract(epoch from now()) * 1000)::bigint, 'bookedPhone', v_digits));

  v_when := to_char(p_date, 'DD/MM') || ' às ' || to_char(v_start, 'HH24:MI');
  insert into ic_chat.conversations(tenant_id, contact_id, channel, status, unread, last_message, last_time, extra)
  values (p_tenant, v_contact, 'whatsapp', 'nova', 1, 'Agendou online: ' || (v_service->>'name') || ' ' || v_when,
          to_char(now() at time zone 'America/Sao_Paulo', 'HH24:MI'),
          jsonb_build_object('createdAt', (extract(epoch from now()) * 1000)::bigint, 'kanbanStage', 'agendado'))
  on conflict (tenant_id, contact_id, channel) do update
    set unread = ic_chat.conversations.unread + 1, last_message = excluded.last_message, updated_at = now()
  returning id into v_conv;
  insert into ic_chat.messages(tenant_id, conversation_id, sender_type, kind, content)
  values (p_tenant, v_conv, 'system', 'system', 'Agendamento online: ' || (v_service->>'name') || ' com ' || (v_pro->>'name') || ' em ' || v_when || '.');

  return jsonb_build_object('ok', true, 'id', v_id, 'deposit', coalesce((v_service->>'deposit')::numeric, 0));
end;
$$;

revoke all on function ic_chat.booking_settings(uuid) from public, anon, authenticated;
revoke all on function ic_chat.booking_page_info(uuid) from public;
revoke all on function ic_chat.booking_busy(uuid, date, date) from public;
revoke all on function ic_chat.book_appointment(uuid, text, text, date, text, text, text) from public;
grant execute on function ic_chat.booking_settings(uuid) to service_role;
grant execute on function ic_chat.booking_page_info(uuid) to anon, authenticated, service_role;
grant execute on function ic_chat.booking_busy(uuid, date, date) to anon, authenticated, service_role;
grant execute on function ic_chat.book_appointment(uuid, text, text, date, text, text, text) to anon, authenticated, service_role;
