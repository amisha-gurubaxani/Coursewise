"use client";

import { useState } from "react";
import { createAssignment } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/client";
import type { Course } from "@/lib/types";

export function AssignmentForm({ courses }: { courses: Pick<Course, "id" | "title" | "course_code">[] }) {
  const [filePath, setFilePath] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(file?: File) {
    setFilePath("");
    if (!file) return;
    if (file.type !== "application/pdf" || file.size > 20 * 1024 * 1024) {
      setStatus("Choose a PDF file up to 20 MB.");
      return;
    }
    setBusy(true);
    setStatus("Uploading…");
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Please sign in again before uploading.");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from("assignment-files").upload(path, file, { contentType: "application/pdf" });
      if (error) throw new Error(error.message);
      setFilePath(path);
      setStatus("Attachment uploaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="form" action={createAssignment}>
    <label className="field">Course<select name="course_id" required defaultValue=""><option value="" disabled>Select a course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.course_code} — {course.title}</option>)}</select></label>
    <label className="field">Assignment title<input name="title" required maxLength={160} /></label>
    <label className="field">Instructions<textarea name="description" rows={5} maxLength={5000} /></label>
    <label className="field">Due date (IST)<input name="due_date_local" type="datetime-local" required /></label>
    <label className="field">Maximum marks<input name="max_marks" type="number" min={1} max={100000} defaultValue={100} required /></label>
    <label className="field">Attachment PDF (optional, 20 MB max)<input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={(event) => void upload(event.target.files?.[0])} /></label>
    <input type="hidden" name="attachment_url" value={filePath} />
    {status && <p className={status.includes("up to") || status.includes("failed") || status.includes("sign in") ? "notice error" : "muted"} role="status">{status}</p>}
    <SubmitButton disabled={busy} loading={busy} loadingText={busy ? "Uploading…" : "Saving…"}>Create assignment</SubmitButton>
  </form>;
}
