# Football Carpool

Mobile-first carpool scheduling for children’s football practices. The week starts on Sunday, dates use Israeli formatting, and calendar operations use `Asia/Jerusalem`.

## Included MVP

- Supabase magic-link sign-in for active parents
- Shared cloud data that stays synchronized across parents, phones, and browsers
- Local cache for fast loading and temporary connection loss
- Sunday-first responsive monthly calendar
- Touch-friendly mobile agenda with the full month grid on larger screens
- Green assigned, orange unassigned, and gray historical practices
- Parent, child, and practice management
- One-off and recurring Monday/Wednesday-style practices
- Individual editing of generated recurring occurrences
- Individual cancellation and restoration of any practice occurrence
- Driver assignment with live driving counts and capacity warnings
- Upcoming unassigned dashboard and fair-share summary
- Stable calendar event IDs, cancellation on reassignment/removal, and duplicate prevention
- Resend email integration with `.ics` attachment
- Automatic `.ics` download fallback when email is not configured
- RTL toggle and Hebrew text support
- Private JSON backup/import for safekeeping or migrating older browser data
- Production-ready Supabase/PostgreSQL schema with RLS

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and sign in with `gmagali1989@gmail.com`.

Copy `.env.example` to `.env.local` and provide the Supabase URL and publishable key to use shared storage. When Supabase is configured, it is the source of truth and every authenticated active parent sees the same data. The browser keeps a local cache so the last schedule remains available while reconnecting.

If the cloud workspace is still empty, the first authenticated browser containing existing carpool records uploads them automatically. Use the database icon in the header to export an additional private JSON backup or import an older backup into the shared schedule. The backup contains family and schedule details, so keep it private and never add it to this public repository.

Without Supabase environment variables, the application intentionally falls back to device-only storage for local development.

## Calendar invitations

When Supabase and Resend are configured, assigning a driver sends an email with an iCalendar invitation. Reassigning or cancelling sends a cancellation for the previous driver. Assignments use a stable UID per practice, preventing duplicate calendar events.

If the email service is not configured or fails, the browser downloads the same valid `.ics` invitation as a fallback.

### Configure email delivery

1. Create a Supabase project and run all SQL files in `supabase/migrations/` in numeric order.
2. Deploy `supabase/functions/send-driver-invitation`.
3. Set Edge Function secrets `RESEND_API_KEY` and `CALENDAR_FROM_EMAIL`.
4. Add GitHub repository secrets `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. In Supabase Auth URL configuration, add `https://gilumagali.github.io/football-carpool/` as an allowed redirect URL.

The Edge Function verifies the Supabase user is an active parent and limits each authenticated user to 20 email notifications per hour. Secrets remain server-side in Supabase, as required for safe browser deployment.

## GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds the static export and deploys it on every push to `main`.

## Shared Supabase data

Run all migrations in `supabase/migrations/` in numeric order. They create the normalized carpool tables, seed the owner account, secure reads to authenticated active parents, and expose one validated transaction for replacing a complete schedule. Browser clients cannot write tables directly.

`src/lib/cloud-store.ts` loads and synchronizes the shared records. `src/lib/store.ts` remains the local cache and offline fallback.
