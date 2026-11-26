import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPortal = path.startsWith("/teacher") || path.startsWith("/student");

  if (isPortal && !user) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/login";
    destination.searchParams.set("next", path);
    return NextResponse.redirect(destination);
  }

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile) {
      role = profile.role;
      if (path === "/login" || path === "/register" || path === "/") {
        const destination = request.nextUrl.clone();
        destination.pathname = role === "teacher" || role === "admin" ? "/teacher" : "/student";
        destination.search = "";
        return NextResponse.redirect(destination);
      }
    } else if (isPortal) {
      const destination = request.nextUrl.clone();
      destination.pathname = "/login";
      destination.searchParams.set("error", "Account profile is not available");
      return NextResponse.redirect(destination);
    }
  }

  if (isPortal && user && role) {
    const permitted = path.startsWith("/teacher")
      ? role === "teacher" || role === "admin"
      : role === "student" || role === "admin";
    if (!permitted && role) {
      const destination = request.nextUrl.clone();
      destination.pathname = role === "teacher" ? "/teacher" : "/student";
      destination.search = "";
      return NextResponse.redirect(destination);
    }
  }
  return response;
}

export const config = {
  matcher: ["/", "/login", "/register", "/teacher/:path*", "/student/:path*"],
};
