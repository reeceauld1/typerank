-- Enforces unique, format-checked usernames. Run this once in the Supabase
-- SQL Editor if you already ran the earlier schema files.
--
-- (Email uniqueness needs no changes here — Supabase Auth already rejects
-- signing up twice with the same email.)

alter table public.user_stats add column username text;

-- Backfill in case any account already exists without one, so the NOT NULL
-- constraint below can't fail. Extremely unlikely to ever run for real.
update public.user_stats
  set username = 'user' || substr(replace(user_id::text, '-', ''), 1, 12)
  where username is null;

alter table public.user_stats alter column username set not null;

alter table public.user_stats
  add constraint user_stats_username_format check (username ~ '^[A-Za-z0-9]{3,20}$');

-- Case-insensitive uniqueness (so "John" and "john" can't both be taken).
create unique index user_stats_username_lower_idx on public.user_stats (lower(username));

-- Dead code: nothing on the client calls this anymore (guest-stat import
-- was removed), and it would fail now anyway since it inserts into
-- user_stats without a username.
drop function if exists public.import_local_stats(
  integer, integer, double precision, double precision, double precision,
  integer, integer, integer, integer, integer, integer
);

-- No longer needed: the user_stats row (with its required username) is now
-- always created at signup by the trigger below, and this insert would
-- fail anyway since username has no default.
create or replace function public.record_test_result(
  p_mode text,
  p_value integer,
  p_wpm integer,
  p_accuracy integer,
  p_raw_wpm integer,
  p_correct_chars integer,
  p_incorrect_chars integer,
  p_time_elapsed double precision,
  p_xp_earned integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.test_history (
    user_id, mode, value, wpm, accuracy, raw_wpm,
    correct_chars, incorrect_chars, time_elapsed, xp_earned
  ) values (
    v_user_id, p_mode, p_value, p_wpm, p_accuracy, p_raw_wpm,
    p_correct_chars, p_incorrect_chars, p_time_elapsed, p_xp_earned
  );

  update public.user_stats set
    total_tests = total_tests + 1,
    total_xp = total_xp + p_xp_earned,
    total_time_typed = total_time_typed + p_time_elapsed,
    total_accuracy_sum = total_accuracy_sum + p_accuracy,
    total_wpm_sum = total_wpm_sum + p_wpm,
    best_wpm_time10 = case when p_mode = 'time' and p_value = 10
      then greatest(best_wpm_time10, p_wpm) else best_wpm_time10 end,
    best_wpm_time30 = case when p_mode = 'time' and p_value = 30
      then greatest(best_wpm_time30, p_wpm) else best_wpm_time30 end,
    best_wpm_time60 = case when p_mode = 'time' and p_value = 60
      then greatest(best_wpm_time60, p_wpm) else best_wpm_time60 end,
    best_wpm_words10 = case when p_mode = 'words' and p_value = 10
      then greatest(best_wpm_words10, p_wpm) else best_wpm_words10 end,
    best_wpm_words25 = case when p_mode = 'words' and p_value = 25
      then greatest(best_wpm_words25, p_wpm) else best_wpm_words25 end,
    best_wpm_words50 = case when p_mode = 'words' and p_value = 50
      then greatest(best_wpm_words50, p_wpm) else best_wpm_words50 end,
    updated_at = now()
  where user_id = v_user_id;
end;
$$;

grant execute on function public.record_test_result to authenticated;

-- Creates the user_stats row (with username) the moment an account is
-- created, using the username captured at signup time
-- (supabase.auth.signUp({ options: { data: { username } } })). If it's
-- missing, malformed, or already taken, this raises and the whole signup
-- transaction — including the auth.users row itself — rolls back.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_stats (user_id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the signup form check availability before submitting, so a taken
-- username shows a clear inline error instead of a failed signup.
create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.user_stats where lower(username) = lower(p_username)
  );
$$;

grant execute on function public.is_username_available to anon, authenticated;
