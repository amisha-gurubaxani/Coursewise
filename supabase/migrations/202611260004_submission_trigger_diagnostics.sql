create or replace function public.protect_submission_inserts()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  current_role public.user_role;
begin
  if auth.uid() is null then
    return new;
  end if;

  select role into current_role from public.profiles where id = auth.uid();
  if current_role is distinct from 'student' then
    raise exception 'Submission rejected: the authenticated profile is not a student';
  end if;
  if new.student_id is distinct from auth.uid() then
    raise exception 'Submission rejected: student_id does not match the authenticated user';
  end if;
  if split_part(new.file_url, '/', 1) is distinct from auth.uid()::text then
    raise exception 'Submission rejected: file must be stored in the authenticated user folder';
  end if;

  new.marks_obtained := null;
  new.teacher_feedback := null;
  new.graded_at := null;
  new.submitted_at := now();
  return new;
end;
$$;
