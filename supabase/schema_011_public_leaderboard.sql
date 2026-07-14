-- Lets signed-out visitors see the global leaderboard. "select any stats"
-- (schema_006_friends.sql) only granted read access to authenticated users;
-- the global leaderboard tab is now open to logged-out visitors too, so
-- anon needs the same (already non-sensitive — no PII beyond username)
-- read access.
create policy "select any stats anon" on public.user_stats
  for select to anon using (true);
