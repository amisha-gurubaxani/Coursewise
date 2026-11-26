import Link from "next/link";
import { getProfile } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

export async function Navigation() {
  const profile = await getProfile();
  const isTeacher = profile?.role === "teacher" || profile?.role === "admin";
  return (
    <header className="topbar">
      <Link className="brand" href="/">Coursewise</Link>
      {profile ? (
        <nav className="navlinks" aria-label="Main navigation">
          <Link href={isTeacher ? "/teacher" : "/student"}>Dashboard</Link>
          <Link href={isTeacher ? "/teacher/courses" : "/student/courses"}>Courses</Link>
          <Link href={isTeacher ? "/teacher/assignments" : "/student/assignments"}>Assignments</Link>
          <span>{profile.full_name}</span>
          <form action={signOut}><button className="button secondary" type="submit">Sign out</button></form>
        </nav>
      ) : (
        <nav className="navlinks"><Link href="/login">Sign in</Link><Link href="/register">Create account</Link></nav>
      )}
    </header>
  );
}
