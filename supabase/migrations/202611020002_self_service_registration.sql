-- Apply after 202611020001. Personal email addresses are allowed; no approval list.
begin;
create schema if not exists quoteflow_private;
revoke all on schema quoteflow_private from public;
grant usage on schema quoteflow_private to authenticated;

-- Look up confirmation server-side; user-editable metadata is not proof of verification.
create or replace function quoteflow_private.is_verified_user()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where id = (select auth.uid())
      and email_confirmed_at is not null
      and coalesce(email, '') <> ''
  );
$$;
revoke all on function quoteflow_private.is_verified_user() from public, anon;
grant execute on function quoteflow_private.is_verified_user() to authenticated;

drop policy if exists "Employees can read shared models" on public.quoteflow_lift_models;
drop policy if exists "Employees can add shared models" on public.quoteflow_lift_models;
create policy "Verified accounts can read shared models"
  on public.quoteflow_lift_models for select to authenticated
  using ((select quoteflow_private.is_verified_user()));
create policy "Verified accounts can add shared models"
  on public.quoteflow_lift_models for insert to authenticated
  with check (created_by = (select auth.uid()) and (select quoteflow_private.is_verified_user()));
-- The original employee table is retained but no longer used for authorization.
commit;
