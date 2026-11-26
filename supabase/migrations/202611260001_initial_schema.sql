create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'teacher', 'student');
create type public.material_type as enum ('notes_pdf', 'syllabus', 'lecture_slide', 'reference_doc');
create type public.enrollment_status as enum ('active', 'completed', 'dropped');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.user_role not null default 'student',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  total_semesters int not null default 6 check (total_semesters between 1 and 12),
  created_at timestamptz not null default now()
);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  batch_name text not null,
  start_year int not null,
  end_year int not null,
  current_semester int not null default 1 check (current_semester > 0),
  created_at timestamptz not null default now(),
  unique(program_id, batch_name),
  check (end_year >= start_year)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  status public.enrollment_status not null default 'active',
  created_at timestamptz not null default now(),
  unique(student_id, batch_id)
);
create unique index enrollments_one_active_per_student
  on public.enrollments(student_id) where status = 'active';

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  course_code text not null,
  title text not null,
  description text,
  semester int not null check (semester > 0),
  credits int not null default 4 check (credits > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(program_id, course_code)
);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_number int not null check (module_number > 0),
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  unique(course_id, module_number)
);

create table public.course_materials (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  material_type public.material_type not null default 'notes_pdf',
  file_url text not null,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes > 0),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.textbooks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  author text not null,
  edition text,
  isbn text,
  file_url text,
  created_at timestamptz not null default now(),
  check (file_url is null or file_url ~* '^https?://')
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  attachment_url text,
  due_date timestamptz not null,
  max_marks int not null default 100 check (max_marks > 0),
  created_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  file_url text not null,
  student_notes text,
  submitted_at timestamptz not null default now(),
  marks_obtained numeric(7,2),
  teacher_feedback text,
  graded_at timestamptz,
  unique(assignment_id, student_id),
  check (marks_obtained is null or marks_obtained >= 0)
);

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin')) $$;

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
  if current_role is distinct from 'student' or new.student_id is distinct from auth.uid()
    or (storage.foldername(new.file_url))[1] is distinct from auth.uid()::text then
    raise exception 'Not authorized to create this submission';
  end if;
  new.marks_obtained := null;
  new.teacher_feedback := null;
  new.graded_at := null;
  new.submitted_at := now();
  return new;
end;
$$;
create trigger protect_submission_inserts
  before insert on public.submissions for each row execute procedure public.protect_submission_inserts();

create or replace function public.protect_submission_updates()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  current_role public.user_role;
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.id is distinct from old.id
    or new.assignment_id is distinct from old.assignment_id
    or new.student_id is distinct from old.student_id then
    raise exception 'Submission ownership and assignment cannot be changed';
  end if;

  select role into current_role from public.profiles where id = auth.uid();
  if current_role = 'student' and old.student_id = auth.uid() then
    if old.marks_obtained is not null or new.marks_obtained is distinct from old.marks_obtained
      or new.teacher_feedback is distinct from old.teacher_feedback
      or new.graded_at is distinct from old.graded_at
      or (storage.foldername(new.file_url))[1] is distinct from auth.uid()::text then
      raise exception 'Students cannot change grading information';
    end if;
    new.submitted_at := now();
  elsif current_role = 'teacher' and exists (
    select 1 from public.assignments a where a.id = old.assignment_id and a.teacher_id = auth.uid()
  ) then
    if new.file_url is distinct from old.file_url
      or new.student_notes is distinct from old.student_notes
      or new.submitted_at is distinct from old.submitted_at then
      raise exception 'Teachers can only update grading information';
    end if;
  elsif current_role = 'admin' then
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
create trigger protect_submission_updates
  before update on public.submissions for each row execute procedure public.protect_submission_updates();

create or replace function public.validate_course_semester()
returns trigger language plpgsql set search_path = public
as $$
declare
  semester_count int;
begin
  select total_semesters into semester_count from public.programs where id = new.program_id;
  if semester_count is null or new.semester > semester_count then
    raise exception 'Course semester must be within the selected program';
  end if;
  return new;
end;
$$;
create trigger courses_semester_within_program
  before insert or update of program_id, semester on public.courses
  for each row execute procedure public.validate_course_semester();

create or replace function public.move_course_module(module_uuid uuid, direction int)
returns void language plpgsql security definer set search_path = public
as $$
declare
  target_course uuid;
  target_number int;
  other_id uuid;
  other_number int;
  temporary_number int;
begin
  if direction not in (-1, 1) or not public.is_staff() then
    raise exception 'Not authorized to reorder course modules';
  end if;
  select course_id, module_number into target_course, target_number
    from public.course_modules where id = module_uuid for update;
  if target_course is null then
    raise exception 'Module not found';
  end if;
  select id, module_number into other_id, other_number
    from public.course_modules
    where course_id = target_course
      and ((direction = 1 and module_number > target_number) or (direction = -1 and module_number < target_number))
    order by case when direction = 1 then module_number end asc,
             case when direction = -1 then module_number end desc
    limit 1 for update;
  if other_id is null then
    return;
  end if;
  select coalesce(max(module_number), 0) + 1 into temporary_number
    from public.course_modules where course_id = target_course;
  update public.course_modules set module_number = temporary_number where id = module_uuid;
  update public.course_modules set module_number = target_number where id = other_id;
  update public.course_modules set module_number = other_number where id = module_uuid;
end;
$$;

create index courses_program_semester_idx on public.courses(program_id, semester);
create index assignments_course_due_idx on public.assignments(course_id, due_date);
create index submissions_student_idx on public.submissions(student_id);

create or replace function public.can_read_course(course_uuid uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_staff() or exists (
    select 1
    from public.courses c
    join public.enrollments e on e.status = 'active' and e.student_id = auth.uid()
    join public.batches b on b.id = e.batch_id
      and b.program_id = c.program_id and b.current_semester = c.semester
    where c.id = course_uuid
  )
$$;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  selected_role public.user_role;
  selected_batch uuid;
begin
  selected_role := case when new.raw_user_meta_data->>'role' = 'teacher' then 'teacher'::public.user_role else 'student'::public.user_role end;
  insert into public.profiles(id, email, full_name, role)
  values (new.id, new.email, coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)), selected_role);

  if selected_role = 'student' then
    selected_batch := nullif(new.raw_user_meta_data->>'batch_id', '')::uuid;
    if selected_batch is null or not exists (select 1 from public.batches where id = selected_batch) then
      raise exception 'A valid batch must be selected for student registration';
    end if;
    insert into public.enrollments(student_id, batch_id) values (new.id, selected_batch);
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.create_profile_for_new_user();

create or replace function public.prevent_profile_role_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and (new.role is distinct from old.role or new.id is distinct from old.id or new.email is distinct from old.email) then
    raise exception 'Profile role, id, and email are managed by authentication';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger profiles_protect_role
  before update on public.profiles for each row execute procedure public.prevent_profile_role_change();

alter table public.profiles enable row level security;
alter table public.programs enable row level security;
alter table public.batches enable row level security;
alter table public.enrollments enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.course_materials enable row level security;
alter table public.textbooks enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;

create policy "Profiles readable by authenticated users" on public.profiles
  for select to authenticated using (true);
create policy "Users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Programs are public for registration" on public.programs
  for select to anon, authenticated using (true);
create policy "Batches are public for registration" on public.batches
  for select to anon, authenticated using (true);

create policy "Students and staff read enrollments" on public.enrollments
  for select to authenticated using (student_id = auth.uid() or public.is_staff());
create policy "Students create their own enrollment" on public.enrollments
  for insert to authenticated with check (
    student_id = auth.uid()
    and status = 'active'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'student')
    and exists (select 1 from public.batches where id = batch_id)
  );
create policy "Staff update enrollments" on public.enrollments
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "Authenticated users read courses" on public.courses
  for select to authenticated using (public.can_read_course(id));
create policy "Staff manage courses" on public.courses
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "Authenticated users read modules" on public.course_modules
  for select to authenticated using (public.can_read_course(course_id));
create policy "Staff manage modules" on public.course_modules
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "Authenticated users read materials" on public.course_materials
  for select to authenticated using (
    exists (select 1 from public.course_modules m where m.id = module_id and public.can_read_course(m.course_id))
  );
create policy "Staff manage materials" on public.course_materials
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "Authenticated users read textbooks" on public.textbooks
  for select to authenticated using (public.can_read_course(course_id));
create policy "Staff manage textbooks" on public.textbooks
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "Authenticated users read assignments" on public.assignments
  for select to authenticated using (public.can_read_course(course_id));
create policy "Teachers manage own assignments" on public.assignments
  for all to authenticated using (teacher_id = auth.uid() and public.is_staff())
  with check (teacher_id = auth.uid() and public.is_staff());

create policy "Students read their submissions and staff read all" on public.submissions
  for select to authenticated using (
    student_id = auth.uid()
    or exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
create policy "Enrolled students submit their own work" on public.submissions
  for insert to authenticated with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.assignments a
      join public.courses c on c.id = a.course_id
      join public.enrollments e on e.student_id = auth.uid() and e.status = 'active'
      join public.batches b on b.id = e.batch_id and b.program_id = c.program_id and b.current_semester = c.semester
      where a.id = assignment_id
    )
  );
create policy "Students update their own ungraded work" on public.submissions
  for update to authenticated using (student_id = auth.uid() and marks_obtained is null)
  with check (student_id = auth.uid() and marks_obtained is null);
create policy "Assignment teachers grade submissions" on public.submissions
  for update to authenticated using (
    (exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid())
      and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher'))
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    (exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid())
      and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher'))
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
  ('course-materials', 'course-materials', false, 20971520, array['application/pdf']),
  ('textbooks', 'textbooks', false, 52428800, array['application/pdf']),
  ('assignment-files', 'assignment-files', false, 20971520, array['application/pdf']),
  ('submissions', 'submissions', false, 20971520, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated users read learning files" on storage.objects
  for select to authenticated using (
    (bucket_id = 'course-materials' and exists (
      select 1 from public.course_materials cm
      join public.course_modules m on m.id = cm.module_id
      where cm.file_url = name and public.can_read_course(m.course_id)
    ))
    or (bucket_id = 'textbooks' and exists (
      select 1 from public.textbooks t where t.file_url = name and public.can_read_course(t.course_id)
    ))
    or (bucket_id = 'assignment-files' and exists (
      select 1 from public.assignments a where a.attachment_url = name and public.can_read_course(a.course_id)
    ))
  );
create policy "Staff upload course resources" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('course-materials', 'textbooks', 'assignment-files')
    and public.is_staff()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Staff delete course resources" on storage.objects
  for delete to authenticated using (
    bucket_id in ('course-materials', 'textbooks', 'assignment-files') and public.is_staff()
  );
create policy "Users read own or assigned submission files" on storage.objects
  for select to authenticated using (
    bucket_id = 'submissions'
    and (
      exists (select 1 from public.submissions s where s.file_url = name and s.student_id = auth.uid())
      or exists (
        select 1 from public.submissions s
        join public.assignments a on a.id = s.assignment_id
        where s.file_url = name and a.teacher_id = auth.uid()
      )
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  );

grant usage on schema public to anon, authenticated;
grant select on public.programs, public.batches to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.enrollments, public.courses, public.course_modules,
  public.course_materials, public.textbooks, public.assignments, public.submissions to authenticated;
grant select, insert, delete on storage.objects to authenticated;
revoke all on function public.move_course_module(uuid, int) from public, anon;
grant execute on function public.move_course_module(uuid, int) to authenticated;
create policy "Students upload their own submission files" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'student')
  );
