insert into public.parents (name, email, active)
values ('Gil', 'gmagali1989@gmail.com', true)
on conflict (email) do update
set name = excluded.name,
    active = excluded.active;

create table public.email_notifications (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete cascade,
  recipient_email text not null,
  practice_id text not null,
  event_id text not null,
  action text not null check (action in ('send', 'cancel')),
  status text not null check (status in ('sent', 'failed')),
  created_at timestamptz not null default now()
);

create index email_notifications_requester_created_idx
  on public.email_notifications(requested_by, created_at desc);

alter table public.email_notifications enable row level security;
