import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";

export default async function TeacherCoursesPage({ searchParams }: { searchParams: Promise<{ program?: string; semester?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  let coursesQuery = supabase.from("courses").select("id,course_code,title,description,semester,credits,programs(name,code)").order("created_at", { ascending: false });
  if (params.program) coursesQuery = coursesQuery.eq("program_id", params.program);
  const semester = Number(params.semester);
  if (Number.isInteger(semester) && semester > 0) coursesQuery = coursesQuery.eq("semester", semester);
  const [{ data: programs, error: programError }, { data: courses, error }] = await Promise.all([
    supabase.from("programs").select("id,name,code").order("name"),
    coursesQuery,
  ]);
  if (programError) throw new Error(`Could not load programs: ${programError.message}`);
  if (error) throw new Error(`Could not load courses: ${error.message}`);
  return <>
    <div className="pagehead"><div><span className="eyebrow">Course catalog</span><h1>Courses</h1><p className="muted">Build and maintain semester-wise course content.</p></div><Link className="button" href="/teacher/courses/new">New course</Link></div>
    <form className="card row" method="get" style={{ marginBottom: 18 }}>
      <label className="field">Program<select name="program" defaultValue={params.program ?? ""}><option value="">All programs</option>{programs?.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label>
      <label className="field">Semester<input name="semester" type="number" min={1} max={12} defaultValue={params.semester ?? ""} placeholder="All semesters" /></label>
      <div className="actions"><SubmitButton nativeSubmit>Filter</SubmitButton><Link className="button secondary" href="/teacher/courses">Clear</Link></div>
    </form>
    {courses?.length ? <div className="grid">{courses.map((course) => <article className="card" key={course.id}>
      <span className="badge">{course.programs?.[0]?.code ?? "Program"} · Semester {course.semester}</span>
      <h2 style={{ marginBottom: 6 }}>{course.title}</h2><p className="muted">{course.course_code} · {course.credits} credits</p>
      <p className="muted">{course.description || "No description yet."}</p>
      <Link className="button secondary" href={`/teacher/courses/${course.id}`}>Manage course</Link>
    </article>)}</div> : <div className="empty">No courses yet. Create your first course to get started.</div>}
  </>;
}
