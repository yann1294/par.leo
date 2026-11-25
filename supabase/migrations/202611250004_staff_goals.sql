begin;

-- Staff membership is intentionally separate from user-editable profiles. This prevents
-- a student from escalating their own account by updating a profile field.
create table public.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('teacher','admin')),
  created_at timestamptz not null default now()
);
alter table public.staff_roles enable row level security;
revoke all on public.staff_roles from anon, authenticated;

-- SECURITY DEFINER functions expose only the current user's role/boolean result; direct
-- reads of staff_roles remain revoked from browser roles.
create function public.get_staff_role() returns text language sql stable security definer set search_path = '' as $$
  select role from public.staff_roles where user_id = auth.uid();
$$;
revoke all on function public.get_staff_role() from public;
grant execute on function public.get_staff_role() to authenticated;

create function public.is_staff(required_role text default null) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_roles where user_id = auth.uid() and (required_role is null or role = required_role));
$$;
revoke all on function public.is_staff(text) from public;
grant execute on function public.is_staff(text) to authenticated;

alter table public.topics add column moderation_status text not null default 'approved' check (moderation_status in ('draft','submitted','approved','rejected'));
alter table public.topics add column moderation_note text not null default '' check (char_length(moderation_note) <= 1000);
alter table public.topics add column moderated_by uuid references auth.users(id) on delete set null;
alter table public.topics add column moderated_at timestamptz;

create policy topics_staff_read on public.topics for select to authenticated using (public.is_staff());
create policy topics_staff_insert on public.topics for insert to authenticated with check (
  public.is_staff() and owner_id = (select auth.uid()) and not published and moderation_status = 'draft'
);
create policy topics_teacher_update on public.topics for update to authenticated using (
  owner_id = (select auth.uid()) and public.is_staff() and moderation_status in ('draft','rejected')
) with check (owner_id = (select auth.uid()) and not published and moderation_status in ('draft','submitted'));
create policy topics_admin_update on public.topics for update to authenticated using (public.is_staff('admin')) with check (public.is_staff('admin'));
create policy topics_staff_delete on public.topics for delete to authenticated using (
  owner_id = (select auth.uid()) and public.is_staff() and moderation_status in ('draft','rejected')
);
grant insert, update, delete on public.topics to authenticated;

-- Goal preferences are private, realtime-synchronized records owned by each student.
create table public.student_goals (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  weekly_sessions integer not null default 3 check (weekly_sessions between 1 and 21),
  reminder_enabled boolean not null default false,
  reminder_days integer[] not null default '{1,3,5}',
  reminder_time time not null default '18:00',
  timezone text not null default 'UTC' check (char_length(timezone) <= 80),
  updated_at timestamptz not null default now(),
  check (reminder_days <@ array[0,1,2,3,4,5,6])
);
alter table public.student_goals enable row level security;
create policy student_goals_owner on public.student_goals for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.student_goals to authenticated;
revoke all on public.student_goals from anon;

create function public.touch_student_goal() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at := now(); return new; end; $$;
create trigger touch_student_goal before update on public.student_goals for each row execute function public.touch_student_goal();

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='student_goals') then
    alter publication supabase_realtime add table public.student_goals;
  end if;
end $$;

commit;

-- Bootstrap staff only after reviewing the account email:
-- insert into public.staff_roles (user_id, role)
-- select id, 'admin' from auth.users where email = 'owner@example.com';
