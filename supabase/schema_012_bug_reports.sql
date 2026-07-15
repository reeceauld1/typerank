-- Bug reports table for the /report-bug page. Insert-only from the client
-- (anon and authenticated both allowed, since reporting a bug shouldn't
-- require an account) — no select policy is granted to either role, so
-- submissions are only readable via the Supabase dashboard (which uses the
-- service role and bypasses RLS), not by any client-side query.
create table public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  description text not null,
  contact_email text,
  page_url text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.bug_reports enable row level security;

create policy "insert bug reports" on public.bug_reports
  for insert to anon, authenticated with check (true);
