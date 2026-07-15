-- Lets FriendsContext subscribe to postgres_changes on friendships (see
-- src/context/FriendsContext.tsx), so a request being accepted/declined by
-- the *other* side updates your friends list live instead of requiring a
-- manual page refresh. duels and ranked_matches already do this same
-- add-to-publication step for the same reason.
alter publication supabase_realtime add table public.friendships;
