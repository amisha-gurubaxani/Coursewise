create or replace function public.protect_submission_inserts()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_profile_role public.user_role;
begin
  if auth.uid() is null then
    return new;
  end if;

  select p.role into v_profile_role from public.profiles p where p.id = auth.uid();
  if v_profile_role is distinct from 'student' then
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

create or replace function public.protect_submission_updates()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_profile_role public.user_role;
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.id is distinct from old.id
    or new.assignment_id is distinct from old.assignment_id
    or new.student_id is distinct from old.student_id then
    raise exception 'Submission ownership and assignment cannot be changed';
  end if;

  select p.role into v_profile_role from public.profiles p where p.id = auth.uid();
  if v_profile_role = 'student' and old.student_id = auth.uid() then
    if old.marks_obtained is not null or new.marks_obtained is distinct from old.marks_obtained
      or new.teacher_feedback is distinct from old.teacher_feedback
      or new.graded_at is distinct from old.graded_at
      or split_part(new.file_url, '/', 1) is distinct from auth.uid()::text then
      raise exception 'Students cannot change grading information';
    end if;
    new.submitted_at := now();
  elsif v_profile_role = 'teacher' and exists (
    select 1 from public.assignments a where a.id = old.assignment_id and a.teacher_id = auth.uid()
  ) then
    if new.file_url is distinct from old.file_url
      or new.student_notes is distinct from old.student_notes
      or new.submitted_at is distinct from old.submitted_at then
      raise exception 'Teachers can only update grading information';
    end if;
  elsif v_profile_role = 'admin' then
    if new.file_url is distinct from old.file_url
      or new.student_notes is distinct from old.student_notes
      or new.submitted_at is distinct from old.submitted_at then
      raise exception 'Administrators can only update grading information';
    end if;
  else
    raise exception 'Not authorized to update this submission';
  end if;
  if new.marks_obtained is not null and new.marks_obtained > (
    select max_marks from public.assignments where id = new.assignment_id
  ) then
    raise exception 'Marks cannot exceed the assignment maximum';
  end if;
  return new;
end;
$$;
