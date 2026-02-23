-- 022_edge_function_rate_limit.sql
-- Minimal DB-backed rate limit primitive for Edge Functions.

create table if not exists public.edge_rate_limits (
    key text primary key,
    window_started_at timestamptz not null default now(),
    request_count integer not null default 0,
    updated_at timestamptz not null default now()
);

create or replace function public.spendnote_consume_rate_limit(
    p_key text,
    p_limit integer,
    p_window_seconds integer
)
returns table(
    allowed boolean,
    retry_after_seconds integer,
    remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_now timestamptz := now();
    v_limit integer := greatest(coalesce(p_limit, 1), 1);
    v_window_seconds integer := greatest(coalesce(p_window_seconds, 60), 1);
    v_window_interval interval := make_interval(secs => v_window_seconds);
    v_row public.edge_rate_limits%rowtype;
begin
    if p_key is null or btrim(p_key) = '' then
        return query select false, v_window_seconds, 0;
        return;
    end if;

    insert into public.edge_rate_limits as erl (key, window_started_at, request_count, updated_at)
    values (p_key, v_now, 1, v_now)
    on conflict (key) do update
    set
        window_started_at = case
            when erl.window_started_at <= (v_now - v_window_interval) then v_now
            else erl.window_started_at
        end,
        request_count = case
            when erl.window_started_at <= (v_now - v_window_interval) then 1
            else erl.request_count + 1
        end,
        updated_at = v_now
    returning * into v_row;

    if v_row.request_count > v_limit then
        return query select
            false,
            greatest(1, ceil(extract(epoch from ((v_row.window_started_at + v_window_interval) - v_now)))::integer),
            0;
        return;
    end if;

    return query select
        true,
        0,
        greatest(v_limit - v_row.request_count, 0);
end;
$$;

revoke all on function public.spendnote_consume_rate_limit(text, integer, integer) from public;
grant execute on function public.spendnote_consume_rate_limit(text, integer, integer) to authenticated;
grant execute on function public.spendnote_consume_rate_limit(text, integer, integer) to service_role;
