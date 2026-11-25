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
