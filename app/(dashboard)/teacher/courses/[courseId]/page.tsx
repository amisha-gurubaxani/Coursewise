import Link from "next/link";
import { createModule, createTextbook, moveModule, saveMaterial } from "@/app/actions";
import { FileUpload } from "@/components/file-upload";
import { SubmitButton } from "@/components/submit-button";
import { signedFileUrl } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function TeacherCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const supabase = await createClient();
  const { data: course, error } = await supabase.from("courses")
    .select("id,program_id,course_code,title,description,semester,credits,programs(name,code)")
    .eq("id", courseId).maybeSingle();
  if (error) throw new Error(`Could not load course: ${error.message}`);
  if (!course) notFound();
  const [{ data: modules, error: moduleError }, { data: books, error: bookError }] = await Promise.all([
    supabase.from("course_modules").select("id,module_number,title,description").eq("course_id", course.id).order("module_number"),
    supabase.from("textbooks").select("id,title,author,edition,isbn,file_url").eq("course_id", course.id).order("title"),
  ]);
  if (moduleError || bookError) throw new Error(`Could not load course content: ${moduleError?.message ?? bookError?.message}`);
  const moduleCards = await Promise.all((modules ?? []).map(async (module) => {
    const { data: materials, error: materialsError } = await supabase.from("course_materials")
      .select("id,title,material_type,file_url,file_size_bytes").eq("module_id", module.id).order("created_at");
    if (materialsError) throw new Error(`Could not load learning materials: ${materialsError.message}`);
    return {
      module,
      materials: await Promise.all((materials ?? []).map(async (material) => ({
        ...material, downloadUrl: await signedFileUrl("course-materials", material.file_url),
      }))),
    };
  }));
  return <>
    <div className="pagehead"><div><Link href="/teacher/courses" className="muted">← Courses</Link><p><span className="badge">{course.programs?.[0]?.code} · Semester {course.semester}</span></p><h1>{course.title}</h1><p className="muted">{course.course_code} · {course.credits} credits · {course.description}</p></div><Link href="/teacher/assignments/new" className="button">New assignment</Link></div>
    <section className="card">
      <h2>Syllabus modules</h2>
      {moduleCards.length ? <div className="stack">{moduleCards.map(({ module, materials }, index) => <article className="card" key={module.id}>
        <div className="row"><div><span className="badge">Module {module.module_number}</span><h3>{module.title}</h3><p className="muted">{module.description}</p></div>
          <div className="actions">
            <form action={moveModule}><input type="hidden" name="module_id" value={module.id} /><input type="hidden" name="direction" value="-1" /><SubmitButton className="button secondary" disabled={index === 0}>Move up</SubmitButton></form>
            <form action={moveModule}><input type="hidden" name="module_id" value={module.id} /><input type="hidden" name="direction" value="1" /><SubmitButton className="button secondary" disabled={index === moduleCards.length - 1}>Move down</SubmitButton></form>
          </div>
        </div>
        <div className="stack">{materials.map((material) => <div className="row" key={material.id}><span>{material.title} <span className="muted">({material.material_type})</span></span>{material.downloadUrl && <a className="button secondary" href={material.downloadUrl} target="_blank" rel="noreferrer">Download PDF</a>}</div>)}</div>
        <hr className="rule" /><h3>Upload a PDF</h3>
        <FileUpload bucket="course-materials" action={saveMaterial} fields={{ module_id: module.id, title: "" }} label="Choose a PDF (20 MB max)" />
      </article>)}</div> : <p className="muted">No modules have been added to this course.</p>}
      <hr className="rule" /><h3>Add a module</h3>
      <form className="form" action={createModule}>
        <input type="hidden" name="course_id" value={course.id} />
        <label className="field">Module number<input type="number" min={1} name="module_number" required /></label>
        <label className="field">Title<input name="title" required maxLength={160} /></label>
        <label className="field">Description<textarea name="description" rows={3} maxLength={2000} /></label>
        <SubmitButton>Add module</SubmitButton>
      </form>
    </section>
    <section className="card" style={{ marginTop: 18 }}>
      <h2>Recommended textbooks</h2>
      {books?.length ? <div className="stack">{books.map((book) => <div className="row" key={book.id}><div><strong>{book.title}</strong><p className="muted">{book.author}{book.edition ? ` · ${book.edition}` : ""}{book.isbn ? ` · ISBN ${book.isbn}` : ""}</p></div>{book.file_url && <a href={book.file_url} target="_blank" rel="noreferrer">Open resource</a>}</div>)}</div> : <p className="muted">No textbooks added yet.</p>}
      <hr className="rule" /><h3>Add a textbook</h3>
      <form className="form" action={createTextbook}>
        <input type="hidden" name="course_id" value={course.id} />
        <label className="field">Title<input name="title" required maxLength={200} /></label>
        <label className="field">Author<input name="author" required maxLength={160} /></label>
        <label className="field">Edition<input name="edition" maxLength={80} /></label>
        <label className="field">ISBN<input name="isbn" maxLength={32} /></label>
        <label className="field">PDF or purchase link<input name="file_url" type="url" /></label>
        <SubmitButton>Add textbook</SubmitButton>
      </form>
    </section>
  </>;
}
