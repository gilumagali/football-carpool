# Football Carpool

Mobile-first carpool scheduling for children’s football practices. The week starts on Sunday, dates use Israeli formatting, and calendar operations use `Asia/Jerusalem`.

## Included MVP

- Email-based demo sign-in for active parents
- Sunday-first responsive monthly calendar
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
- Production-ready Supabase/PostgreSQL schema with RLS

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and sign in with `gmagali1989@gmail.com`.

Data is stored in the browser for the immediately usable MVP. The initial workspace contains only the configured owner account; parents, children, and practices are entered through the application.

## Calendar invitations

Assignments download a valid iCalendar request that can be opened on the device. Assignments use a stable UID per practice, preventing duplicate events when an assignment changes.

GitHub Pages is static hosting and cannot securely send email or run the former invitation API. Automated email delivery requires a hosted backend such as a Supabase Edge Function. The application is structured so that service can replace `src/lib/calendar-invitation.ts`.

## GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds the static export and deploys it on every push to `main`.

## Supabase migration

Run `supabase/migrations/001_initial_schema.sql` in a Supabase project. The schema includes parents, children, practices, practice participants, assignments, invite status, one-driver-per-practice constraints, role-ready parent records, indexes, and authenticated-user RLS policies.

The browser repository in `src/lib/store.ts` is deliberately isolated so it can be replaced by a Supabase repository without changing calendar or assignment components.
