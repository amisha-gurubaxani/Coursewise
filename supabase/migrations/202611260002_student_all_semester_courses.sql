create or replace function public.can_read_course(course_uuid uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_staff() or exists (
    select 1
    from public.courses c
    join public.enrollments e on e.status = 'active' and e.student_id = auth.uid()
    join public.batches b on b.id = e.batch_id and b.program_id = c.program_id
    where c.id = course_uuid
  )
$$;
