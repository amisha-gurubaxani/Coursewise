import Link from "next/link";
import { notFound } from "next/navigation";
import { signedFileUrl } from "@/lib/data";
import { currentStudentCourses } from "@/lib/portal-data";
import { createClient, getProfile } from "@/lib/supabase/server";

export default async function StudentCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const profile = await getProfile();
  const { courses } = await currentStudentCourses(profile!.id, "all");
  const course = courses.find((item) => item.id === courseId);
  if (!course) notFound();
  const supabase = await createClient();
  const [{ data: modules, error: modulesError }, { data: books, error: booksError }] = await Promise.all([
    supabase.from("course_modules").select("id,module_number,title,description").eq("course_id", course.id).order("module_number"),
    supabase.from("textbooks").select("id,title,author,edition,isbn,file_url").eq("course_id", course.id).order("title"),
  ]);
  if (modulesError || booksError) throw new Error(`Could not load course materials: ${modulesError?.message ?? booksError?.message}`);
  const content = await Promise.all((modules ?? []).map(async (module) => {
    const { data: materials, error } = await supabase.from("course_materials").select("id,title,material_type,file_url,file_size_bytes").eq("module_id", module.id).order("created_at");
    if (error) throw new Error(`Could not load materials: ${error.message}`);
    return { module, materials: await Promise.all((materials ?? []).map(async (material) => ({ ...material, downloadUrl: await signedFileUrl("course-materials", material.file_url) }))) };
  }));
  return <>
    <div className="pagehead"><div><Link href="/student/courses" className="muted">← Courses</Link><p><span className="badge">{course.course_code} · Semester {course.semester}</span></p><h1>{course.title}</h1><p className="muted">{course.description}</p></div></div>
    <section className="card"><h2>Modules and notes</h2>
      {content.length ? <div className="stack">{content.map(({ module, materials }) => <article className="card" key={module.id}><span className="badge">Module {module.module_number}</span><h3>{module.title}</h3><p className="muted">{module.description}</p>
        {materials.length ? <div className="stack">{materials.map((material) => <div className="row" key={material.id}><span>{material.title}</span>{material.downloadUrl && <a className="button secondary" href={material.downloadUrl} target="_blank" rel="noreferrer">Download PDF</a>}</div>)}</div> : <p className="muted">No notes have been shared for this module yet.</p>}
      </article>)}</div> : <p className="muted">The teacher has not added modules yet.</p>}
    </section>
    <section className="card" style={{ marginTop: 18 }}><h2>Recommended textbooks</h2>
      {books?.length ? <div className="stack">{books.map((book) => <div className="row" key={book.id}><div><strong>{book.title}</strong><p className="muted">{book.author}{book.edition ? ` · ${book.edition}` : ""}</p></div>{book.file_url && <a href={book.file_url} target="_blank" rel="noreferrer">Open resource</a>}</div>)}</div> : <p className="muted">No textbooks have been recommended yet.</p>}
    </section>
  </>;
}
