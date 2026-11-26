import Link from "next/link";
import { currentStudentCourses } from "@/lib/portal-data";
import { getProfile } from "@/lib/supabase/server";

export default async function StudentCoursesPage({ searchParams }: { searchParams: Promise<{ semester?: string | string[] }> }) {
  const params = await searchParams;
  const semesterParam = Array.isArray(params.semester) ? undefined : params.semester;
  const requestedSemester = semesterParam === "all" ? "all" : semesterParam ? Number(semesterParam) : undefined;
  const profile = await getProfile();
  const { enrollment, courses, semester } = await currentStudentCourses(profile!.id, requestedSemester);
  const batch = enrollment?.batches as unknown as {
    current_semester: number;
    programs: { name: string; total_semesters: number } | null;
  } | null;
  const selectedSemester = semester === "all" ? "all" : String(semester);
  return <>
    <div className="pagehead"><div><span className="eyebrow">Your learning</span><h1>Semester courses</h1><p className="muted">{batch ? `${batch.programs?.name} · ${semester === "all" ? "All semesters" : `Semester ${semester}`}` : "Your enrollment hasn't been configured yet."}</p></div></div>
    {batch && <form className="card row" method="get" style={{ marginBottom: 18 }}>
      <label className="field">Semester
        <select name="semester" defaultValue={selectedSemester}>
          <option value="all">All semesters</option>
          {Array.from({ length: batch.programs?.total_semesters ?? batch.current_semester }, (_, index) => index + 1).map((value) => (
            <option key={value} value={value}>Semester {value}</option>
          ))}
        </select>
      </label>
      <div className="actions"><button className="button" type="submit">Show courses</button></div>
    </form>}
    {courses.length ? <div className="grid">{courses.map((course) => <article className="card" key={course.id}>
      <span className="badge">{course.course_code} · Semester {course.semester} · {course.credits} credits</span><h2>{course.title}</h2><p className="muted">{course.description || "Explore course modules and learning materials."}</p>
      <Link className="button secondary" href={`/student/courses/${course.id}`}>Open course</Link>
    </article>)}</div> : <div className="empty">{semester === "all" ? "No courses are available for your program yet." : `No courses are available for semester ${semester} yet.`}</div>}
  </>;
}
