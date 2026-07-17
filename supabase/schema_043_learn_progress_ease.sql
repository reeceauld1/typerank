-- Learn mode unlock progression was reported as too hard to advance in:
-- isReadyToUnlock (src/utils/learnMode.ts) required EVERY currently-
-- unlocked letter to individually clear an 85% EMA accuracy bar before the
-- next letter could unlock, so a single persistently-weak letter could
-- stall progress indefinitely as more letters piled up. Eased that bar to
-- 75% client-side, and added a rounds-since-last-unlock backstop: if 10
-- rounds complete with no unlock, the next letter unlocks regardless of
-- accuracy. That counter needs to persist alongside the rest of this
-- table's progress the same way total_reps_since_unlock already does.
alter table public.learn_progress add column if not exists rounds_since_unlock integer not null default 0;

drop function if exists public.save_learn_progress(text, text, jsonb, integer);

create or replace function public.save_learn_progress(
  p_keyboard_layout text,
  p_unlocked_letters text,
  p_letter_accuracy jsonb,
  p_total_reps_since_unlock integer,
  p_rounds_since_unlock integer
)
returns void
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

  insert into public.learn_progress (
    user_id, keyboard_layout, unlocked_letters, letter_accuracy,
    total_reps_since_unlock, rounds_since_unlock, updated_at
  )
  values (
    v_user_id, p_keyboard_layout, p_unlocked_letters, p_letter_accuracy,
    p_total_reps_since_unlock, p_rounds_since_unlock, now()
  )
  on conflict (user_id) do update
  set keyboard_layout = excluded.keyboard_layout,
      unlocked_letters = excluded.unlocked_letters,
      letter_accuracy = excluded.letter_accuracy,
      total_reps_since_unlock = excluded.total_reps_since_unlock,
      rounds_since_unlock = excluded.rounds_since_unlock,
      updated_at = now();
end;
$$;

grant execute on function public.save_learn_progress to authenticated;
