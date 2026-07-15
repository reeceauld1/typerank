-- Learn mode: keybr-style letter-unlocking practice. Unlock eligibility
-- (per-letter EMA accuracy, reps-since-unlock, which letter unlocks next)
-- is computed entirely client-side (src/utils/learnMode.ts) as a pure
-- function of this row's own contents — same precedent as cosmetics
-- (set_equipped_cosmetics etc.): this table just persists the result, with
-- no competitive/leaderboard/XP stake riding on it either way.
create table public.learn_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  keyboard_layout text not null check (keyboard_layout in ('qwerty', 'colemak', 'dvorak')),
  unlocked_letters text not null,
  letter_accuracy jsonb not null default '{}'::jsonb,
  total_reps_since_unlock integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.learn_progress enable row level security;

-- No insert/update policy: every write goes through save_learn_progress
-- below (security definer, bypasses RLS) — this is only needed for the
-- client's own direct read on page load.
create policy "select own learn progress" on public.learn_progress
  for select using (auth.uid() = user_id);

-- Upserts the caller's own row. Trusts client-provided values with no
-- server-side business-logic validation (same as set_equipped_cosmetics) —
-- appropriate here since this data has zero effect on anything competitive.
create or replace function public.save_learn_progress(
  p_keyboard_layout text,
  p_unlocked_letters text,
  p_letter_accuracy jsonb,
  p_total_reps_since_unlock integer
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

  insert into public.learn_progress (user_id, keyboard_layout, unlocked_letters, letter_accuracy, total_reps_since_unlock, updated_at)
  values (v_user_id, p_keyboard_layout, p_unlocked_letters, p_letter_accuracy, p_total_reps_since_unlock, now())
  on conflict (user_id) do update
  set keyboard_layout = excluded.keyboard_layout,
      unlocked_letters = excluded.unlocked_letters,
      letter_accuracy = excluded.letter_accuracy,
      total_reps_since_unlock = excluded.total_reps_since_unlock,
      updated_at = now();
end;
$$;

grant execute on function public.save_learn_progress to authenticated;
