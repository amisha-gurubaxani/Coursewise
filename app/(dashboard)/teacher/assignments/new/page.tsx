import { AssignmentForm } from "@/components/assignment-form";
import { LoadingLink } from "@/components/loading-link";
import { createClient } from "@/lib/supabase/server";

export default async function NewAssignmentPage() {
  const supabase = await createClient();
  const { data: courses, error } = await supabase.from("courses").select("id,title,course_code").order("title");
  if (error) throw new Error(`Could not load courses: ${error.message}`);
  return <>
    <div className="pagehead"><div><span className="eyebrow">Teaching</span><h1>Create assignment</h1><p className="muted">Set instructions, deadline, marks, and an optional PDF attachment.</p></div><LoadingLink className="button secondary" href="/teacher/assignments">Back to assignments</LoadingLink></div>
    {courses?.length ? <section className="card"><AssignmentForm courses={courses} /></section> : <div className="notice">Create a course before creating an assignment.</div>}
  </>;
}
