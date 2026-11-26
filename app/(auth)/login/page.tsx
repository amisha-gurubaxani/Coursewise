import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { LoginForm } from "@/components/auth-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return <><Navigation /><main className="shell" style={{ maxWidth: 560 }}>
    <LoginForm error={params.error} message={params.message} />
    <p className="muted">New here? <Link href="/register">Create an account</Link>.</p>
  </main></>;
}
