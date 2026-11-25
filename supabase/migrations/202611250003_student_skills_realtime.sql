begin;

drop policy if exists topics_insert on public.topics;
drop policy if exists topics_update on public.topics;
drop policy if exists topics_delete on public.topics;
revoke insert, update, delete on public.topics from authenticated;

create table if not exists public.skill_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  exam text not null check (exam in ('TCF','TEF')),
  skill text not null check (skill in ('reading','listening','writing')),
  activity_id text not null,
  response jsonb not null default '{}' check (jsonb_typeof(response) = 'object'),
  score numeric check (score is null or score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, activity_id)
);
alter table public.skill_attempts enable row level security;
create policy skill_attempts_owner on public.skill_attempts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.skill_attempts to authenticated;
revoke all on public.skill_attempts from anon;

create or replace function public.touch_skill_attempt() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists touch_skill_attempt on public.skill_attempts;
create trigger touch_skill_attempt before update on public.skill_attempts for each row execute function public.touch_skill_attempt();

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessions') then
    alter publication supabase_realtime add table public.sessions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'favorites') then
    alter publication supabase_realtime add table public.favorites;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'skill_attempts') then
    alter publication supabase_realtime add table public.skill_attempts;
  end if;
end $$;

commit;
