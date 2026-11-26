-- Rotina diária dos avisos (teste acabando, plano vencendo, acesso encerrado) por e-mail e WhatsApp.
-- Cria uma senha aleatória (cron_secret) que só o banco e a função icchat-notify conhecem e agenda a chamada
-- todo dia às 12:00 UTC (9h de Brasília). Rode no SQL Editor do Supabase. Pode rodar de novo sem problema.
create extension if not exists pg_cron;
create extension if not exists pg_net;

insert into ic_chat.platform_secrets(key, value, secret)
values ('cron_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), true)
on conflict (key) do nothing;

-- Lê a senha na hora de rodar, então ela nunca aparece na lista de agendamentos
create or replace function ic_chat.run_daily_notices()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://umnoiivuntnvsxkysvrr.supabase.co/functions/v1/icchat-notify',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-icchat-cron', (select value from ic_chat.platform_secrets where key = 'cron_secret')
    ),
    body := '{"action":"due"}'::jsonb
  );
end $$;
revoke all on function ic_chat.run_daily_notices() from public, anon, authenticated;

select cron.unschedule('icchat-daily-notices') where exists (select 1 from cron.job where jobname = 'icchat-daily-notices');
select cron.schedule('icchat-daily-notices', '0 12 * * *', 'select ic_chat.run_daily_notices()');
