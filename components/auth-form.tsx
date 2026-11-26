"use client";

import { useState } from "react";
import { signIn, signUp } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import type { Batch, Program } from "@/lib/types";

export function LoginForm({ error, message }: { error?: string; message?: string }) {
  return (
    <div className="card">
      <h1>Welcome back</h1>
      <p className="muted">Sign in to continue to your learning workspace.</p>
      {error && <p className="notice error">{error}</p>}
      {message && <p className="notice">{message}</p>}
      <form className="form" action={signIn}>
        <label className="field">Email<input type="email" name="email" autoComplete="email" required /></label>
        <label className="field">Password<input type="password" name="password" autoComplete="current-password" required /></label>
        <SubmitButton>Sign in</SubmitButton>
      </form>
    </div>
  );
}

export function RegisterForm({ programs, batches, error }: { programs: Program[]; batches: Batch[]; error?: string }) {
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [programId, setProgramId] = useState("");
  const availableBatches = batches.filter((batch) => !programId || batch.program_id === programId);

  return (
    <div className="card">
      <h1>Create your account</h1>
      <p className="muted">Teachers can manage courses. Students enroll in a program and batch.</p>
      {error && <p className="notice error">{error}</p>}
      <form className="form" action={signUp}>
        <label className="field">Full name<input name="full_name" autoComplete="name" required maxLength={100} /></label>
        <label className="field">Email<input type="email" name="email" autoComplete="email" required /></label>
        <label className="field">Password<input type="password" name="password" autoComplete="new-password" minLength={8} required /></label>
        <label className="field">I am a
          <select name="role" value={role} onChange={(event) => setRole(event.target.value as "student" | "teacher")}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </label>
        {role === "student" && (
          <>
            <label className="field">Program
              <select value={programId} onChange={(event) => setProgramId(event.target.value)} required>
                <option value="">Select a program</option>
                {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
              </select>
            </label>
            <label className="field">Batch
              <select name="batch_id" required defaultValue="">
                <option value="">Select your batch</option>
                {availableBatches.filter((batch) => !programId || batch.program_id === programId).map((batch) => (
                  <option key={batch.id} value={batch.id}>{batch.batch_name}</option>
                ))}
              </select>
            </label>
          </>
        )}
        <SubmitButton>Create account</SubmitButton>
      </form>
    </div>
  );
}
