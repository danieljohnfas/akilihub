-- Newsletter subscribers are stored in public.users with a random id (see /api/subscribe).
-- The original handle_new_user() trigger did a plain INSERT, so when such a person later signed
-- up, the unique(email) constraint aborted the whole auth.users insert and signup failed.
--
-- The trigger itself (on_auth_user_created) is unchanged; only the function body is replaced.
-- A stale newsletter-only row (different id, same email, no dependants) is replaced by the real
-- account row, carrying over the person's email_updates choice.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  previous_updates boolean;
begin
  select email_updates into previous_updates
  from public.users
  where email = new.email and id <> new.id;

  delete from public.users where email = new.email and id <> new.id;

  insert into public.users (id, email, full_name, email_updates)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(previous_updates, true)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
