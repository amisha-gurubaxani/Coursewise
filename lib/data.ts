import { createClient } from "@/lib/supabase/server";

export async function signedFileUrl(bucket: string, path: string | null) {
  if (!path) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
  if (error) throw new Error(`Could not create download link: ${error.message}`);
  return data.signedUrl;
}

export function errorMessage(value: unknown) {
  return value instanceof Error ? value.message : "An unexpected error occurred.";
}
