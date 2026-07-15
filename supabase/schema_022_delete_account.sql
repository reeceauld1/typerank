-- Lets a signed-in user permanently delete their own account. Every table
-- with a foreign key to auth.users(id) uses "on delete cascade" (see
-- schema.sql) except public.bug_reports, which intentionally uses
-- "on delete set null" so a submitted bug report persists for the
-- dashboard/service role even after the reporter's account is gone — so
-- deleting the auth.users row here cleans up all other app data
-- automatically via cascade, with that one deliberate exception.
create or replace function public.delete_own_account()
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

  delete from auth.users where id = v_user_id;
end;
$$;

grant execute on function public.delete_own_account to authenticated;
