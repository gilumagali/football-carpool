# Football Carpool

Mobile-first carpool scheduling for children’s football practices. The week starts on Sunday, dates use Israeli formatting, and calendar operations use `Asia/Jerusalem`.

## Included MVP

- Email-based demo sign-in for active parents
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
- Private JSON backup/import for moving local data between devices
- Production-ready Supabase/PostgreSQL schema with RLS

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and sign in with `gmagali1989@gmail.com`.

Data is stored in the browser for the immediately usable MVP. The initial workspace contains only the configured owner account; parents, children, and practices are entered through the application.

Use the database icon in the header to export a private JSON backup. On another phone or browser, open the same menu and import that file. The backup contains family and schedule details, so keep it private and never add it to this public repository.

## Calendar invitations

When Supabase and Resend are configured, assigning a driver sends an email with an iCalendar invitation. Reassigning or cancelling sends a cancellation for the previous driver. Assignments use a stable UID per practice, preventing duplicate calendar events.

If the email service is not configured or fails, the browser downloads the same valid `.ics` invitation as a fallback.

### Configure email delivery

1. Create a Supabase project and run both SQL files in `supabase/migrations/`.
2. Deploy `supabase/functions/send-driver-invitation`.
3. Set Edge Function secrets `RESEND_API_KEY` and `CALENDAR_FROM_EMAIL`.
4. Add GitHub repository secrets `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. In Supabase Auth URL configuration, add `https://gilumagali.github.io/football-carpool/` as an allowed redirect URL.

The Edge Function verifies the Supabase user is an active parent and limits each authenticated user to 20 email notifications per hour. Secrets remain server-side in Supabase, as required for safe browser deployment.

## GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds the static export and deploys it on every push to `main`.

## Supabase migration

Run `supabase/migrations/001_initial_schema.sql` in a Supabase project. The schema includes parents, children, practices, practice participants, assignments, invite status, one-driver-per-practice constraints, role-ready parent records, indexes, and authenticated-user RLS policies.

The browser repository in `src/lib/store.ts` is deliberately isolated so it can be replaced by a Supabase repository without changing calendar or assignment components.
