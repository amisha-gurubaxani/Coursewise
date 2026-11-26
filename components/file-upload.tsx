"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/client";

type Props = {
  bucket: "course-materials" | "submissions" | "assignment-files" | "textbooks";
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  label: string;
};

export function FileUpload({ bucket, action, fields, label }: Props) {
  const [path, setPath] = useState("");
  const [size, setSize] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(file?: File) {
    setPath("");
    setSize("");
    if (!file) return;
    if (file.type !== "application/pdf") {
      setStatus("Choose a PDF file.");
      return;
    }
    const maximumMb = bucket === "textbooks" ? 50 : 20;
    const maximum = maximumMb * 1024 * 1024;
    if (file.size > maximum) {
      setStatus(`The PDF must be ${maximumMb} MB or smaller.`);
      return;
    }
    setBusy(true);
    setStatus("Uploading…");
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Please sign in again before uploading.");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
        contentType: "application/pdf", upsert: false,
      });
      if (error) throw new Error(error.message);
      setPath(filePath);
      setSize(String(file.size));
      setStatus("PDF uploaded. Complete the form to save it.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" action={action}>
      {Object.entries(fields).map(([name, value]) => name === "title" ? (
        <label className="field" key={name}>Title<input name={name} defaultValue={value} required maxLength={160} /></label>
      ) : name === "student_notes" ? (
        <label className="field" key={name}>Notes (optional)<textarea name={name} maxLength={2000} /></label>
      ) : <input key={name} type="hidden" name={name} value={value} />)}
      <input type="hidden" name="file_url" value={path} />
      {(bucket === "course-materials") && <input type="hidden" name="file_size_bytes" value={size} />}
      <label className="field">{label}<input type="file" accept="application/pdf,.pdf" required disabled={busy} onChange={(event) => void upload(event.target.files?.[0])} /></label>
      {status && <p className={status.includes("failed") || status.includes("Choose") || status.includes("sign in") ? "notice error" : "muted"} role="status">{status}</p>}
      <SubmitButton disabled={busy || !path} loading={busy} loadingText={busy ? "Uploading…" : "Saving…"}>Save PDF</SubmitButton>
    </form>
  );
}
