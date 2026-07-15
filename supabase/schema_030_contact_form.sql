-- Contact form for the /contact page — general questions, feedback, and
-- feature requests, alongside the existing bug-report table. Same
-- insert-only pattern as public.bug_reports: no select policy granted to
-- anon/authenticated, so submissions are only readable via the Supabase
-- dashboard (service role, bypasses RLS).
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  message text not null,
  contact_email text,
  page_url text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

create policy "insert contact messages" on public.contact_messages
  for insert to anon, authenticated with check (true);
