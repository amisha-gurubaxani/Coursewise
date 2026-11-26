import { LoadingLink } from "@/components/loading-link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/server";

export default async function TeacherDashboard() {
  const profile = await getProfile();
  const supabase = await createClient();
  const [courses, assignments, submissions] = await Promise.all([
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.from("assignments").select("id", { count: "exact", head: true }).eq("teacher_id", profile!.id),
    supabase.from("submissions").select("id", { count: "exact", head: true }),
  ]);
  const failed = [courses.error, assignments.error, submissions.error].find(Boolean);
  if (failed) throw new Error(`Could not load teacher dashboard: ${failed.message}`);
  return <>
    <div className="pagehead"><div><span className="eyebrow">Teacher workspace</span><h1>Good to see you, {profile?.full_name}.</h1><p className="muted">Manage courses, share learning resources, and review student progress.</p></div></div>
    <section className="grid">
      <article className="card"><span className="eyebrow">Catalog</span><h2>{courses.count ?? 0}</h2><p className="muted">Courses available</p><LoadingLink className="button secondary" href="/teacher/courses">Manage courses</LoadingLink></article>
      <article className="card"><span className="eyebrow">Teaching</span><h2>{assignments.count ?? 0}</h2><p className="muted">Assignments you created</p><LoadingLink className="button secondary" href="/teacher/assignments">Manage assignments</LoadingLink></article>
      <article className="card"><span className="eyebrow">Review</span><h2>{submissions.count ?? 0}</h2><p className="muted">Student submissions</p><LoadingLink className="button secondary" href="/teacher/assignments">Review work</LoadingLink></article>
    </section>
    <section className="card" style={{ marginTop: 20 }}><h2>Quick actions</h2><div className="actions"><LoadingLink className="button" href="/teacher/courses/new">Create a course</LoadingLink><LoadingLink className="button secondary" href="/teacher/assignments/new">Create an assignment</LoadingLink></div></section>
  </>;
}
