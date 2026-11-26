import Link from "next/link";
import { notFound } from "next/navigation";
import { gradeSubmission } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTimeIST } from "@/lib/date-time";
import { signedFileUrl } from "@/lib/data";
import { createClient, getProfile } from "@/lib/supabase/server";

export default async function TeacherAssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: assignment, error } = await supabase.from("assignments")
    .select("id,title,description,due_date,max_marks,attachment_url,courses(title,course_code)")
    .eq("id", assignmentId).eq("teacher_id", profile!.id).maybeSingle();
  if (error) throw new Error(`Could not load assignment: ${error.message}`);
  if (!assignment) notFound();
  const [{ data: submissions, error: submissionError }, attachmentUrl] = await Promise.all([
    supabase.from("submissions").select("id,student_id,file_url,student_notes,submitted_at,marks_obtained,teacher_feedback,profiles(full_name,email)")
      .eq("assignment_id", assignment.id).order("submitted_at"),
    signedFileUrl("assignment-files", assignment.attachment_url),
  ]);
  if (submissionError) throw new Error(`Could not load submissions: ${submissionError.message}`);
  const entries = await Promise.all((submissions ?? []).map(async (submission) => ({
    submission, fileUrl: await signedFileUrl("submissions", submission.file_url),
  })));
  return <>
    <div className="pagehead"><div><Link href="/teacher/assignments" className="muted">← Assignments</Link><p><span className="badge">{assignment.courses?.[0]?.course_code} · {assignment.max_marks} marks</span></p><h1>{assignment.title}</h1><p className="muted">{assignment.courses?.[0]?.title} · Due {formatDateTimeIST(assignment.due_date)}</p></div></div>
    <section className="card"><h2>Instructions</h2><p className="muted">{assignment.description || "No additional instructions."}</p>{attachmentUrl && <a className="button secondary" href={attachmentUrl} target="_blank" rel="noreferrer">Download assignment PDF</a>}</section>
    <section className="card" style={{ marginTop: 18 }}><h2>Submissions ({entries.length})</h2>
      {entries.length ? <div className="stack">{entries.map(({ submission, fileUrl }) => <article className="card" key={submission.id}>
        <div className="row"><div><h3>{submission.profiles?.[0]?.full_name ?? "Student"}</h3><p className="muted">{submission.profiles?.[0]?.email} · Submitted {new Date(submission.submitted_at).toLocaleString()}</p></div>{fileUrl && <a className="button secondary" href={fileUrl} target="_blank" rel="noreferrer">Download work</a>}</div>
        {submission.student_notes && <p className="muted">{submission.student_notes}</p>}
        {submission.marks_obtained !== null ? <p><span className="badge">Graded: {submission.marks_obtained} / {assignment.max_marks}</span></p> : <form className="form" action={gradeSubmission}>
          <input type="hidden" name="submission_id" value={submission.id} />
          <label className="field">Marks<input name="marks_obtained" type="number" min={0} max={assignment.max_marks} step="0.01" required /></label>
          <label className="field">Feedback<textarea name="teacher_feedback" rows={3} maxLength={3000} /></label>
          <SubmitButton>Save grade</SubmitButton>
        </form>}
        {submission.teacher_feedback && <p className="muted">Feedback: {submission.teacher_feedback}</p>}
      </article>)}</div> : <div className="empty">No students have submitted work yet.</div>}
    </section>
  </>;
}
