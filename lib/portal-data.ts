import { createClient } from "@/lib/supabase/server";

export async function activeEnrollment(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("enrollments")
    .select("id,batch_id,batches(id,program_id,batch_name,current_semester,programs(name,code,total_semesters))")
    .eq("student_id", studentId).eq("status", "active").maybeSingle();
  if (error) throw new Error(`Could not load student enrollment: ${error.message}`);
  return data;
}

export async function currentStudentCourses(studentId: string, requestedSemester?: number | "all") {
  const enrollment = await activeEnrollment(studentId);
  if (!enrollment?.batches) return { enrollment, courses: [], semester: "all" as const };
  const batch = enrollment.batches as unknown as {
    program_id: string;
    current_semester: number;
    programs: { total_semesters: number } | null;
  };
  const totalSemesters = batch.programs?.total_semesters ?? batch.current_semester;
  const semester: number | "all" = requestedSemester === "all"
    ? "all"
    : typeof requestedSemester === "number"
      && Number.isInteger(requestedSemester)
      && requestedSemester >= 1
      && requestedSemester <= totalSemesters
      ? requestedSemester
      : batch.current_semester;
  const supabase = await createClient();
  const query = supabase.from("courses").select("id,program_id,course_code,title,description,semester,credits,created_by,programs(name,code)")
    .eq("program_id", batch.program_id);
  const { data, error } = semester === "all"
    ? await query.order("semester").order("course_code")
    : await query.eq("semester", semester).order("course_code");
  if (error) throw new Error(`Could not load courses: ${error.message}`);
  return { enrollment, courses: data ?? [], semester };
}
