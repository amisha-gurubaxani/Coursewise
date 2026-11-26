import Link from "next/link";
import { createCourse } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewCoursePage() {
  const supabase = await createClient();
  const { data: programs, error } = await supabase.from("programs").select("id,name,code,total_semesters").order("name");
  if (error) throw new Error(`Could not load programs: ${error.message}`);
  return <>
    <div className="pagehead"><div><span className="eyebrow">Course catalog</span><h1>Create a course</h1><p className="muted">Set the program, semester, and course details.</p></div><Link href="/teacher/courses" className="button secondary">Back to courses</Link></div>
    {programs?.length ? <section className="card">
      <form className="form" action={createCourse}>
        <label className="field">Program<select name="program_id" required defaultValue=""><option value="" disabled>Select a program</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name} ({program.code})</option>)}</select></label>
        <label className="field">Course code<input name="course_code" required maxLength={30} /></label>
        <label className="field">Course title<input name="title" required maxLength={160} /></label>
        <label className="field">Description<textarea name="description" rows={4} maxLength={3000} /></label>
        <label className="field">Semester<input name="semester" type="number" min={1} max={12} required /></label>
        <label className="field">Credits<input name="credits" type="number" min={1} max={30} defaultValue={4} required /></label>
        <button className="button" type="submit">Create course</button>
      </form>
    </section> : <div className="notice">No programs are configured. Run the Supabase seed script first.</div>}
  </>;
}
