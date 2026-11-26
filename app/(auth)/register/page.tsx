import { LoadingLink } from "@/components/loading-link";
import { Navigation } from "@/components/navigation";
import { RegisterForm } from "@/components/auth-form";
import { createClient } from "@/lib/supabase/server";
import type { Batch, Program } from "@/lib/types";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const [{ data: programs, error: programError }, { data: batches, error: batchError }] = await Promise.all([
    supabase.from("programs").select("id,code,name,total_semesters").order("name"),
    supabase.from("batches").select("id,program_id,batch_name,start_year,end_year,current_semester").order("start_year", { ascending: false }),
  ]);
  if (programError || batchError) throw new Error(`Could not load registration options: ${programError?.message ?? batchError?.message}`);
  return <><Navigation /><main className="shell" style={{ maxWidth: 620 }}>
    <RegisterForm programs={(programs ?? []) as Program[]} batches={(batches ?? []) as Batch[]} error={params.error} />
    <p className="muted">Already registered? <LoadingLink href="/login">Sign in</LoadingLink>.</p>
  </main></>;
}
