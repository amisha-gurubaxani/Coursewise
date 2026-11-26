insert into public.programs(code, name, total_semesters) values
  ('BCA', 'Bachelor of Computer Applications', 6),
  ('BTECH_CSE', 'B.Tech Computer Science and Engineering', 8),
  ('BTECH_IT', 'B.Tech Information Technology', 8)
on conflict (code) do nothing;

insert into public.batches(program_id, batch_name, start_year, end_year, current_semester)
select p.id, seed.batch_name, seed.start_year, seed.end_year, seed.current_semester
from (values
  ('BCA', '2026-2029', 2026, 2029, 1),
  ('BTECH_CSE', '2026-2030', 2026, 2030, 1),
  ('BTECH_IT', '2026-2030', 2026, 2030, 1)
) as seed(code, batch_name, start_year, end_year, current_semester)
join public.programs p on p.code = seed.code
on conflict (program_id, batch_name) do nothing;
