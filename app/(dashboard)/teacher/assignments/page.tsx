import Link from "next/link";
import { createClient, getProfile } from "@/lib/supabase/server";

export default async function TeacherAssignmentsPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: assignments, error } = await supabase.from("assignments")
    .select("id,title,description,due_date,max_marks,courses(title,course_code)")
    .eq("teacher_id", profile!.id).order("due_date");
  if (error) throw new Error(`Could not load assignments: ${error.message}`);
  return <>
    <div className="pagehead"><div><span className="eyebrow">Teaching</span><h1>Assignments</h1><p className="muted">Create deadlines and review student submissions.</p></div><Link className="button" href="/teacher/assignments/new">New assignment</Link></div>
    {assignments?.length ? <div className="stack">{assignments.map((assignment) => <article className="card row" key={assignment.id}><div>
      <span className="badge">{assignment.courses?.[0]?.course_code} · {assignment.max_marks} marks</span><h2>{assignment.title}</h2><p className="muted">{assignment.courses?.[0]?.title} · Due {new Date(assignment.due_date).toLocaleString()}</p>
    </div><Link className="button secondary" href={`/teacher/assignments/${assignment.id}`}>View submissions</Link></article>)}</div> : <div className="empty">No assignments yet. Create one to set your first deadline.</div>}
  </>;
}
