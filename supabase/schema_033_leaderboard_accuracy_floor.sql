-- A run under 40% accuracy shouldn't be able to buy a leaderboard spot just
-- because its raw speed happened to be high (mashed keys, autotype, etc.).
-- Everything else about the run still records as normal (history, xp,
-- totals) — only the best_wpm_* columns (what the leaderboard reads) are
-- gated on the floor. Mirrors the client-side check in TypingTest.tsx.
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

  -- No upsert needed here: the user_stats row (with its required username)
  -- is always created at signup by the handle_new_user trigger below.
  update public.user_stats set
    total_tests = total_tests + 1,
    total_xp = total_xp + p_xp_earned,
    total_time_typed = total_time_typed + p_time_elapsed,
    total_accuracy_sum = total_accuracy_sum + p_accuracy,
    total_wpm_sum = total_wpm_sum + p_wpm,
    best_wpm_time10 = case when p_mode = 'time' and p_value = 10 and p_accuracy >= 40
      then greatest(best_wpm_time10, p_wpm) else best_wpm_time10 end,
    best_wpm_time30 = case when p_mode = 'time' and p_value = 30 and p_accuracy >= 40
      then greatest(best_wpm_time30, p_wpm) else best_wpm_time30 end,
    best_wpm_time60 = case when p_mode = 'time' and p_value = 60 and p_accuracy >= 40
      then greatest(best_wpm_time60, p_wpm) else best_wpm_time60 end,
    best_wpm_words10 = case when p_mode = 'words' and p_value = 10 and p_accuracy >= 40
      then greatest(best_wpm_words10, p_wpm) else best_wpm_words10 end,
    best_wpm_words25 = case when p_mode = 'words' and p_value = 25 and p_accuracy >= 40
      then greatest(best_wpm_words25, p_wpm) else best_wpm_words25 end,
    best_wpm_words50 = case when p_mode = 'words' and p_value = 50 and p_accuracy >= 40
      then greatest(best_wpm_words50, p_wpm) else best_wpm_words50 end,
    updated_at = now()
  where user_id = v_user_id;
end;
$$;

grant execute on function public.record_test_result to authenticated;
