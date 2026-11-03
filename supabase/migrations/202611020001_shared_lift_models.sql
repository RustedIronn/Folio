-- Run once in the new project's SQL editor. No customer data is stored here.
begin;

create table public.quoteflow_employees (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.quoteflow_employees enable row level security;
revoke all on public.quoteflow_employees from anon, authenticated;
grant select on public.quoteflow_employees to authenticated;
create policy "Employees can check their own membership"
  on public.quoteflow_employees for select to authenticated
  using (user_id = (select auth.uid()));
-- No client can add itself to the employee list.

create table public.quoteflow_lift_models (
  id uuid primary key default gen_random_uuid(),
  description text not null check (char_length(btrim(description)) between 1 and 180),
  lift_type text not null check (char_length(btrim(lift_type)) between 1 and 80),
  speed text not null default '' check (char_length(speed) <= 180),
  car_door text not null default '' check (char_length(car_door) <= 180),
  door_frame text not null default '' check (char_length(door_frame) <= 180),
  landing_door text not null default '' check (char_length(landing_door) <= 180),
  motor text not null default '' check (char_length(motor) <= 180),
  controller text not null default '' check (char_length(controller) <= 180),
  rope text not null default '' check (char_length(rope) <= 180),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.quoteflow_lift_models enable row level security;
revoke all on public.quoteflow_lift_models from anon, authenticated;
grant select on public.quoteflow_lift_models to authenticated;
grant insert (id, description, lift_type, speed, car_door, door_frame,
  landing_door, motor, controller, rope) on public.quoteflow_lift_models to authenticated;

create policy "Employees can read shared models"
  on public.quoteflow_lift_models for select to authenticated
  using (exists (select 1 from public.quoteflow_employees where user_id = (select auth.uid())));
create policy "Employees can add shared models"
  on public.quoteflow_lift_models for insert to authenticated
  with check (created_by = (select auth.uid()) and exists (
    select 1 from public.quoteflow_employees where user_id = (select auth.uid())
  ));
-- Models are append-only. There are no client UPDATE or DELETE grants/policies.
create index quoteflow_lift_models_created_at_idx on public.quoteflow_lift_models(created_at, id);
commit;
