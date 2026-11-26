# Coursewise

A role-based course management app built with Next.js 16, TypeScript, Tailwind CSS, and Supabase.

## Local setup

1. Install Node.js 20.9+ and npm.
2. Install dependencies with `npm install`.
3. Create a Supabase project. In its SQL editor, run every file in `supabase/migrations/` in filename order, then run `supabase/seed.sql`.
4. Copy the sample values from `.env.example` into `.env` and replace them with the Supabase project URL and publishable/anon key from **Project Settings → API**.
5. In Supabase Auth settings, configure the local site URL as `http://localhost:3000` and enable email/password sign-in. Configure SMTP or disable email confirmation for local-only testing.
6. Run `npm run dev` and open `http://localhost:3000`.

The `.env` in this workspace contains placeholders only. Do not put a Supabase service-role key in client-exposed environment variables.

## Included workflows

- Student and teacher registration, login, and role-based portal routing.
- Student enrollment into a program batch during signup.
- Teacher course catalog, modules with reordering, PDF materials, recommended textbooks, and assignments.
- Student course and assignment browsing, submission, and grading feedback across program semesters.
- PostgreSQL row-level security and private Supabase Storage buckets.

## Storage and security notes

The migration creates private buckets for course resources, assignment PDFs, and submissions. File uploads accept PDFs only and have per-bucket size limits. Download URLs are signed for ten minutes. Keep the Supabase migration and RLS policies enabled in production. Teacher registration is intentionally open to match the supplied requirements; use Supabase Auth email confirmation and institution-level controls if teachers must be verified before access.

## Deployment

1. Run the SQL files in `supabase/migrations/` in filename order in your production Supabase project's SQL editor, then run `supabase/seed.sql` if you want the sample data.
2. Import the repository into Vercel. Vercel should detect Next.js automatically; keep the project root at the repository root.
3. In the Vercel project's **Settings → Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` using the values from **Supabase → Project Settings → API**. Apply them to the environments you will deploy (Production, Preview, and/or Development). Never use the Supabase service-role key for these variables.
4. Deploy the project. In Supabase Auth settings, set the Site URL to the deployed domain and add that domain to the allowed redirect URLs. Repeat this for any custom domain you attach in Vercel.

Vercel runs the production build (`npm run build`) during deployment. You can also run it locally before pushing changes.
