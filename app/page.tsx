import { LoadingLink } from "@/components/loading-link";
import { Navigation } from "@/components/navigation";

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main className="shell">
        <section className="hero">
          <span className="eyebrow">Learning, organized</span>
          <h1>Everything your courses need, in one place.</h1>
          <p>Explore semester-wise courses, find learning materials, submit assignments, and keep teaching teams organized.</p>
          <div className="actions" style={{ marginTop: 26 }}>
            <LoadingLink className="button" href="/register">Get started</LoadingLink>
            <LoadingLink className="button secondary" href="/login">Sign in</LoadingLink>
          </div>
        </section>
        <section className="grid" style={{ marginTop: 24 }}>
          <article className="card"><h2>For teachers</h2><p className="muted">Build course catalogs, organize syllabus modules, share PDFs, create assignments, and grade student work.</p></article>
          <article className="card"><h2>For students</h2><p className="muted">Enroll in your program and batch, browse your current semester, access materials, and submit assignments.</p></article>
          <article className="card"><h2>Built for learning</h2><p className="muted">Supabase authentication, PostgreSQL row-level security, and private file storage keep access controlled.</p></article>
        </section>
      </main>
    </>
  );
}
