"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

async function requireRole(roles: Role[]) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (error || !profile || !roles.includes(profile.role as Role)) throw new Error("You do not have permission to perform this action.");
  return { supabase, user };
}

function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? "").trim();
  if (!value) throw new Error(`${key.replaceAll("_", " ")} is required.`);
  return value;
}

export async function signIn(form: FormData) {
  const email = required(form, "email");
  const password = required(form, "password");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=Could+not+load+signed-in+user");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError) throw new Error(`Could not load your profile: ${profileError.message}`);
  redirect(profile?.role === "teacher" || profile?.role === "admin" ? "/teacher" : "/student");
}

export async function signUp(form: FormData) {
  const name = required(form, "full_name");
  const email = required(form, "email");
  const password = required(form, "password");
  const role = required(form, "role");
  const batchId = String(form.get("batch_id") ?? "");
  if (!["student", "teacher"].includes(role)) redirect("/register?error=Choose+a+valid+account+type");
  if (password.length < 8) redirect("/register?error=Password+must+be+at+least+8+characters");
  if (role === "student" && !batchId) redirect("/register?error=Choose+your+program+and+batch");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name, role, ...(role === "student" ? { batch_id: batchId } : {}) } },
  });
  if (error) redirect(`/register?error=${encodeURIComponent(error.message)}`);
  redirect("/login?message=Account+created.+Check+your+email+if+confirmation+is+enabled.");
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Could not sign out: ${error.message}`);
  redirect("/login");
}

export async function createCourse(form: FormData) {
  const { supabase, user } = await requireRole(["teacher", "admin"]);
  const semester = Number(required(form, "semester"));
  const credits = Number(required(form, "credits"));
  if (!Number.isInteger(semester) || semester < 1 || !Number.isInteger(credits) || credits < 1) throw new Error("Semester and credits must be positive whole numbers.");
  const { error } = await supabase.from("courses").insert({
    program_id: required(form, "program_id"), course_code: required(form, "course_code"),
    title: required(form, "title"), description: String(form.get("description") ?? "").trim() || null,
    semester, credits, created_by: user.id,
  });
  if (error) throw new Error(`Could not create course: ${error.message}`);
  revalidatePath("/teacher/courses");
  redirect("/teacher/courses");
}

export async function createModule(form: FormData) {
  const { supabase } = await requireRole(["teacher", "admin"]);
  const courseId = required(form, "course_id");
  const moduleNumber = Number(required(form, "module_number"));
  if (!Number.isInteger(moduleNumber) || moduleNumber < 1) throw new Error("Module number must be a positive whole number.");
  const { error } = await supabase.from("course_modules").insert({
    course_id: courseId, module_number: moduleNumber, title: required(form, "title"),
    description: String(form.get("description") ?? "").trim() || null,
  });
  if (error) throw new Error(`Could not create module: ${error.message}`);
  revalidatePath(`/teacher/courses/${courseId}`);
}

export async function saveMaterial(form: FormData) {
  const { supabase, user } = await requireRole(["teacher", "admin"]);
  const size = Number(form.get("file_size_bytes"));
  const filePath = required(form, "file_url");
  if (!filePath.startsWith(`${user.id}/`)) throw new Error("Uploaded files must belong to your account.");
  const { error } = await supabase.from("course_materials").insert({
    module_id: required(form, "module_id"), title: required(form, "title"),
    material_type: String(form.get("material_type") || "notes_pdf"),
    file_url: filePath, file_size_bytes: Number.isFinite(size) ? size : null, uploaded_by: user.id,
  });
  if (error) throw new Error(`Could not save material: ${error.message}`);
  revalidatePath("/teacher/courses");
}

export async function createTextbook(form: FormData) {
  const { supabase } = await requireRole(["teacher", "admin"]);
  const courseId = required(form, "course_id");
  const fileUrl = String(form.get("file_url") ?? "").trim();
  if (fileUrl) {
    let parsedUrl: URL;
    try { parsedUrl = new URL(fileUrl); } catch { throw new Error("Enter a valid textbook URL."); }
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") throw new Error("Textbook links must use HTTP or HTTPS.");
  }
  const { error } = await supabase.from("textbooks").insert({
    course_id: courseId, title: required(form, "title"), author: required(form, "author"),
    edition: String(form.get("edition") ?? "").trim() || null,
    isbn: String(form.get("isbn") ?? "").trim() || null,
    file_url: fileUrl || null,
  });
  if (error) throw new Error(`Could not add textbook: ${error.message}`);
  revalidatePath(`/teacher/courses/${courseId}`);
}

export async function createAssignment(form: FormData) {
  const { supabase, user } = await requireRole(["teacher", "admin"]);
  const dueDate = new Date(required(form, "due_date"));
  const maxMarks = Number(required(form, "max_marks"));
  if (!Number.isFinite(dueDate.getTime()) || !Number.isInteger(maxMarks) || maxMarks < 1) throw new Error("Enter a valid due date and positive whole-number marks.");
  const attachment = String(form.get("attachment_url") ?? "").trim();
  if (attachment && !attachment.startsWith(`${user.id}/`)) throw new Error("Uploaded attachments must belong to your account.");
  const { error } = await supabase.from("assignments").insert({
    course_id: required(form, "course_id"), teacher_id: user.id, title: required(form, "title"),
    description: String(form.get("description") ?? "").trim() || null,
    due_date: dueDate.toISOString(), max_marks: maxMarks,
    attachment_url: attachment || null,
  });
  if (error) throw new Error(`Could not create assignment: ${error.message}`);
  revalidatePath("/teacher/assignments");
  redirect("/teacher/assignments");
}

export async function saveSubmission(form: FormData) {
  const { supabase, user } = await requireRole(["student"]);
  const assignmentId = required(form, "assignment_id");
  const filePath = required(form, "file_url");
  if (!filePath.startsWith(`${user.id}/`)) throw new Error("Uploaded files must belong to your account.");
  const { error } = await supabase.from("submissions").upsert({
    assignment_id: assignmentId, student_id: user.id, file_url: filePath,
    student_notes: String(form.get("student_notes") ?? "").trim() || null,
    submitted_at: new Date().toISOString(),
  }, { onConflict: "assignment_id,student_id" });
  if (error) throw new Error(`Could not submit assignment: ${error.message}`);
  revalidatePath("/student/assignments");
  revalidatePath(`/student/assignments/${assignmentId}`);
}

export async function gradeSubmission(form: FormData) {
  const { supabase } = await requireRole(["teacher", "admin"]);
  const submissionId = required(form, "submission_id");
  const marks = Number(required(form, "marks_obtained"));
  const { data: submission, error: submissionError } = await supabase.from("submissions")
    .select("assignment_id,assignments(max_marks)").eq("id", submissionId).single();
  if (submissionError || !submission) throw new Error(`Could not load assignment marks: ${submissionError?.message ?? "Submission not found."}`);
  const assignment = submission.assignments as unknown as { max_marks: number };
  const maxMarks = assignment.max_marks;
  if (!Number.isFinite(marks) || marks < 0 || marks > maxMarks) throw new Error(`Marks must be between 0 and ${maxMarks}.`);
  const { error } = await supabase.from("submissions").update({
    marks_obtained: marks,
    teacher_feedback: String(form.get("teacher_feedback") ?? "").trim() || null,
    graded_at: new Date().toISOString(),
  }).eq("id", submissionId);
  if (error) throw new Error(`Could not grade submission: ${error.message}`);
  revalidatePath("/teacher/assignments");
}

export async function moveModule(form: FormData) {
  const { supabase } = await requireRole(["teacher", "admin"]);
  const moduleId = required(form, "module_id");
  const direction = Number(required(form, "direction"));
  if (direction !== -1 && direction !== 1) throw new Error("Module direction must be up or down.");
  const { error } = await supabase.rpc("move_course_module", { module_uuid: moduleId, direction });
  if (error) throw new Error(`Could not reorder module: ${error.message}`);
  revalidatePath("/teacher/courses");
}
