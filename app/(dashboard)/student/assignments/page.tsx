import Link from "next/link";
import { getProfile, createClient } from "@/lib/supabase/server";
import { currentStudentCourses } from "@/lib/portal-data";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTimeIST } from "@/lib/date-time";

export default async function StudentAssignmentsPage({ searchParams }: { searchParams: Promise<{ semester?: string | string[] }> }) {
  const params = await searchParams;
  const semesterParam = Array.isArray(params.semester) ? undefined : params.semester;
  const requestedSemester = semesterParam === "all" ? "all" : semesterParam ? Number(semesterParam) : undefined;
  const profile = await getProfile();
  const { enrollment, courses, semester } = await currentStudentCourses(profile!.id, requestedSemester);
  const batch = enrollment?.batches as unknown as {
    current_semester: number;
    programs: { name: string; total_semesters: number } | null;
  } | null;
  const supabase = await createClient();
  const { data: assignments, error } = courses.length
    ? await supabase.from("assignments").select("id,course_id,title,description,due_date,max_marks")
      .in("course_id", courses.map((course) => course.id)).order("due_date")
    : { data: [], error: null };
  if (error) throw new Error(`Could not load assignments: ${error.message}`);
  const submissions = assignments?.length ? await supabase.from("submissions")
    .select("assignment_id,marks_obtained").eq("student_id", profile!.id)
    .in("assignment_id", assignments.map((assignment) => assignment.id)) : { data: [], error: null };
  if (submissions.error) throw new Error(`Could not load submission status: ${submissions.error.message}`);
  const submitted = new Map((submissions.data ?? []).map((item) => [item.assignment_id, item.marks_obtained]));
  const coursesById = new Map(courses.map((course) => [course.id, course]));
  const assignmentCards = (assignments ?? []).map((assignment) => {
    const course = coursesById.get(assignment.course_id);
    if (!course) throw new Error(`Could not find course for assignment ${assignment.id}.`);
    return { assignment, course };
  });
  const selectedSemester = semester === "all" ? "all" : String(semester);
  return <>
    <div className="pagehead"><div><span className="eyebrow">Your learning</span><h1>Assignments</h1><p className="muted">{semester === "all" ? "All semesters" : `Semester ${semester}`} · Deadlines, submissions, and feedback from your teachers.</p></div></div>
    {batch && <form className="card row" method="get" style={{ marginBottom: 18 }}>
      <label className="field">Semester
        <select name="semester" defaultValue={selectedSemester}>
          <option value="all">All semesters</option>
          {Array.from({ length: batch.programs?.total_semesters ?? batch.current_semester }, (_, index) => index + 1).map((value) => (
            <option key={value} value={value}>Semester {value}</option>
          ))}
        </select>
      </label>
      <div className="actions"><SubmitButton nativeSubmit>Show assignments</SubmitButton></div>
    </form>}
    {assignmentCards.length ? <div className="stack">{assignmentCards.map(({ assignment, course }) => {
      const mark = submitted.get(assignment.id);
      const isSubmitted = submitted.has(assignment.id);
      return <article className="card row" key={assignment.id}><div>
        <span className="badge">{course.course_code} · Semester {course.semester} · {assignment.max_marks} marks</span><h2>{assignment.title}</h2>
        <p className="muted">{course.title} · Due {formatDateTimeIST(assignment.due_date)}</p>
        <p className="muted">{isSubmitted ? mark === null ? "Submitted · awaiting grade" : `Graded · ${mark} / ${assignment.max_marks}` : new Date(assignment.due_date) < new Date() ? "Past due" : "Not submitted"}</p>
      </div><Link className="button secondary" href={`/student/assignments/${assignment.id}`}>{isSubmitted ? "View status" : "Open assignment"}</Link></article>;
    })}</div> : <div className="empty">{semester === "all" ? "No assignments have been published for your program yet." : `No assignments have been published for semester ${semester} yet.`}</div>}
  </>;
}
