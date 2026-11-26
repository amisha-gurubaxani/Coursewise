import { LoadingLink } from "@/components/loading-link";
import { getProfile } from "@/lib/supabase/server";
import { activeEnrollment, currentStudentCourses } from "@/lib/portal-data";
import { createClient } from "@/lib/supabase/server";
import { formatDateTimeIST } from "@/lib/date-time";

export default async function StudentDashboard() {
  const profile = await getProfile();
  const { enrollment, courses } = await currentStudentCourses(profile!.id);
  const batch = enrollment?.batches as unknown as { batch_name: string; current_semester: number; programs: { name: string } } | null;
  const supabase = await createClient();
  const courseIds = courses.map((course) => course.id);
  const { data: assignments, error } = courseIds.length
    ? await supabase.from("assignments").select("id,title,due_date,course_id").in("course_id", courseIds).order("due_date").limit(5)
    : { data: [], error: null };
  if (error) throw new Error(`Could not load assignments: ${error.message}`);
  return <>
    <div className="pagehead"><div><span className="eyebrow">Student workspace</span><h1>Welcome, {profile?.full_name}.</h1><p className="muted">{batch ? `${batch.programs?.name} · Batch ${batch.batch_name} · Semester ${batch.current_semester}` : "Your program enrollment is not set up yet."}</p></div></div>
    {!enrollment && <div className="notice">No active enrollment was found. Ask your institution to confirm your student batch.</div>}
    <section className="grid">
      <article className="card"><span className="eyebrow">Current semester</span><h2>{courses.length}</h2><p className="muted">Courses available</p><LoadingLink className="button secondary" href="/student/courses">Browse courses</LoadingLink></article>
      <article className="card"><span className="eyebrow">Upcoming</span><h2>{assignments?.length ?? 0}</h2><p className="muted">Assignments in your courses</p><LoadingLink className="button secondary" href="/student/assignments">View assignments</LoadingLink></article>
    </section>
    <section className="card" style={{ marginTop: 20 }}>
      <div className="row"><h2>Upcoming assignments</h2><LoadingLink href="/student/assignments">All assignments →</LoadingLink></div>
      {assignments?.length ? <div className="stack">{assignments.map((assignment) => <div className="row" key={assignment.id}><div><strong>{assignment.title}</strong><p className="muted">Due {formatDateTimeIST(assignment.due_date)}</p></div><LoadingLink className="button secondary" href={`/student/assignments/${assignment.id}`}>Open</LoadingLink></div>)}</div> : <p className="muted">Nothing due right now.</p>}
    </section>
  </>;
}
