import Link from "next/link";
import { notFound } from "next/navigation";
import { saveSubmission } from "@/app/actions";
import { FileUpload } from "@/components/file-upload";
import { signedFileUrl } from "@/lib/data";
import { currentStudentCourses } from "@/lib/portal-data";
import { createClient, getProfile } from "@/lib/supabase/server";

export default async function StudentAssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const profile = await getProfile();
  const { courses } = await currentStudentCourses(profile!.id, "all");
  if (!courses.length) notFound();
  const supabase = await createClient();
  const courseIds = courses.map((course) => course.id);
  const { data: assignment, error } = await supabase.from("assignments")
    .select("id,course_id,title,description,due_date,max_marks,attachment_url")
    .eq("id", assignmentId).in("course_id", courseIds).maybeSingle();
  if (error) throw new Error(`Could not load assignment: ${error.message}`);
  if (!assignment) notFound();
  const course = courses.find((item) => item.id === assignment.course_id);
  if (!course) notFound();
  const { data: submission, error: submissionError } = await supabase.from("submissions")
    .select("id,file_url,student_notes,submitted_at,marks_obtained,teacher_feedback")
    .eq("assignment_id", assignment.id).eq("student_id", profile!.id).maybeSingle();
  if (submissionError) throw new Error(`Could not load your submission: ${submissionError.message}`);
  const [attachmentUrl, submissionUrl] = await Promise.all([
    signedFileUrl("assignment-files", assignment.attachment_url),
    signedFileUrl("submissions", submission?.file_url ?? null),
  ]);
  const pastDue = new Date(assignment.due_date).getTime() < Date.now();
  return <>
    <div className="pagehead"><div><Link href="/student/assignments" className="muted">← Assignments</Link><p><span className="badge">{course.course_code} · Semester {course.semester} · {assignment.max_marks} marks</span></p><h1>{assignment.title}</h1><p className="muted">{course.title} · Due {new Date(assignment.due_date).toLocaleString()}</p></div></div>
    <section className="card"><h2>Instructions</h2><p className="muted">{assignment.description || "No additional instructions."}</p>{attachmentUrl && <a className="button secondary" href={attachmentUrl} target="_blank" rel="noreferrer">Download assignment PDF</a>}</section>
    <section className="card" style={{ marginTop: 18 }}><h2>Your submission</h2>
      {submission ? <div className="stack">
        <p className="muted">Submitted {new Date(submission.submitted_at).toLocaleString()}</p>
        {submissionUrl && <a className="button secondary" href={submissionUrl} target="_blank" rel="noreferrer">Download your submission</a>}
        {submission.marks_obtained !== null ? <p><span className="badge">Grade: {submission.marks_obtained} / {assignment.max_marks}</span></p> : <p className="muted">Your work is awaiting a grade.</p>}
        {submission.teacher_feedback && <div><strong>Teacher feedback</strong><p className="muted">{submission.teacher_feedback}</p></div>}
        {submission.marks_obtained === null && <><hr className="rule" /><p className="muted">Upload again to replace your submission.</p><FileUpload bucket="submissions" action={saveSubmission} fields={{ assignment_id: assignment.id, student_notes: "" }} label="Replace with a PDF (20 MB max)" /></>}
      </div> : pastDue ? <p className="notice">The due date has passed. Contact your teacher if you need to submit late work.</p>
        : <FileUpload bucket="submissions" action={saveSubmission} fields={{ assignment_id: assignment.id, student_notes: "" }} label="Upload your solution (PDF, 20 MB max)" />}
    </section>
  </>;
}
