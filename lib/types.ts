export type Role = "student" | "teacher" | "admin";
export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  avatar_url: string | null;
};
export type Program = { id: string; code: string; name: string; total_semesters: number };
export type Batch = { id: string; program_id: string; batch_name: string; start_year: number; end_year: number; current_semester: number };
export type Course = { id: string; program_id: string; course_code: string; title: string; description: string | null; semester: number; credits: number; created_by: string | null; programs?: Pick<Program, "name" | "code"> };
export type Module = { id: string; course_id: string; module_number: number; title: string; description: string | null };
export type Material = { id: string; module_id: string; title: string; material_type: string; file_url: string; file_size_bytes: number | null };
export type Textbook = { id: string; course_id: string; title: string; author: string; edition: string | null; isbn: string | null; file_url: string | null };
export type Assignment = { id: string; course_id: string; teacher_id: string; title: string; description: string | null; attachment_url: string | null; due_date: string; max_marks: number; courses?: Pick<Course, "title" | "course_code"> };
export type Submission = { id: string; assignment_id: string; student_id: string; file_url: string; student_notes: string | null; submitted_at: string; marks_obtained: number | null; teacher_feedback: string | null; profiles?: Pick<Profile, "full_name" | "email"> };
