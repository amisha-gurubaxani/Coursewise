import { getProfile } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { LoadingLink } from "@/components/loading-link";
import { SubmitButton } from "@/components/submit-button";

export async function Navigation() {
  const profile = await getProfile();
  const isTeacher = profile?.role === "teacher" || profile?.role === "admin";
  return (
    <header className="topbar">
      <LoadingLink className="brand" href="/">Coursewise</LoadingLink>
      {profile ? (
        <nav className="navlinks" aria-label="Main navigation">
          <LoadingLink href={isTeacher ? "/teacher" : "/student"}>Dashboard</LoadingLink>
          <LoadingLink href={isTeacher ? "/teacher/courses" : "/student/courses"}>Courses</LoadingLink>
          <LoadingLink href={isTeacher ? "/teacher/assignments" : "/student/assignments"}>Assignments</LoadingLink>
          <span>{profile.full_name}</span>
          <form action={signOut}><SubmitButton className="button secondary">Sign out</SubmitButton></form>
        </nav>
      ) : (
        <nav className="navlinks"><LoadingLink href="/login">Sign in</LoadingLink><LoadingLink href="/register">Create account</LoadingLink></nav>
      )}
    </header>
  );
}
