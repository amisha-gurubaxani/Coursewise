drop policy if exists "Enrolled students submit their own work" on public.submissions;

create policy "Enrolled students submit their own work" on public.submissions
  for insert to authenticated with check (
    student_id = auth.uid()
    and exists (
      select 1
      from public.assignments a
      join public.courses c on c.id = a.course_id
      join public.enrollments e on e.student_id = auth.uid() and e.status = 'active'
      join public.batches b on b.id = e.batch_id and b.program_id = c.program_id
      where a.id = assignment_id
    )
  );
