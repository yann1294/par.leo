begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  locale text not null default 'en' check (locale in ('en','fr','es','ar')),
  exam text not null default 'TCF' check (exam in ('TCF','TEF'))
);
create table public.topics (
  id text primary key,
  owner_id uuid references auth.users(id) on delete cascade,
  format text not null check (format in ('tcf-1','tcf-2','tcf-3','tef-a','tef-b')),
  published boolean not null default false,
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now(),
  check (owner_id is null or published = false)
);
create table public.sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  format text not null check (format in ('tcf-1','tcf-2','tcf-3','tef-a','tef-b')),
  topic jsonb not null check (jsonb_typeof(topic) = 'object'),
  status text not null check (status in ('draft','completed')),
  scores integer[] not null default '{0,0,0,0}',
  notes text not null default '' check (char_length(notes) <= 5000),
  duration_seconds integer not null default 0 check (duration_seconds between 0 and 86400),
  state jsonb not null default '{}' check (jsonb_typeof(state) = 'object'),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (array_length(scores, 1) = 4 and 0 <= all(scores) and 5 >= all(scores)),
  check (status <> 'completed' or 1 <= all(scores))
);
create table public.favorites (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topic_id text not null references public.topics(id) on delete cascade,
  primary key (user_id, topic_id)
);
create index topics_owner_idx on public.topics(owner_id);
create index sessions_user_idx on public.sessions(user_id, updated_at desc);

create function public.create_student_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, locale, exam)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80),
    case when new.raw_user_meta_data ->> 'locale' in ('en','fr','es','ar') then new.raw_user_meta_data ->> 'locale' else 'en' end,
    case when new.raw_user_meta_data ->> 'exam' in ('TCF','TEF') then new.raw_user_meta_data ->> 'exam' else 'TCF' end
  ) on conflict (id) do nothing;
  return new;
end;
$$;
create trigger create_student_profile after insert on auth.users for each row execute function public.create_student_profile();

alter table public.profiles enable row level security;
alter table public.topics enable row level security;
alter table public.sessions enable row level security;
alter table public.favorites enable row level security;

create policy profiles_owner on public.profiles for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy topics_read on public.topics for select to anon, authenticated using ((owner_id is null and published) or owner_id = (select auth.uid()));
create policy topics_insert on public.topics for insert to authenticated with check (owner_id = (select auth.uid()) and not published);
create policy topics_update on public.topics for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and not published);
create policy topics_delete on public.topics for delete to authenticated using (owner_id = (select auth.uid()));
create policy sessions_owner on public.sessions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy favorites_owner on public.favorites for all to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and exists (select 1 from public.topics where id = topic_id)
);

grant select on public.topics to anon;
grant select, insert, update, delete on public.profiles, public.topics, public.sessions, public.favorites to authenticated;
revoke all on public.profiles, public.sessions, public.favorites from anon;

create function public.version_session() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.user_id <> old.user_id or new.id <> old.id then
    raise exception 'Session ownership cannot change';
  end if;
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;
create trigger session_version before update on public.sessions for each row execute function public.version_session();
commit;
