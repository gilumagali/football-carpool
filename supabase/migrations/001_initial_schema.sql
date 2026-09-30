create extension if not exists "pgcrypto";

create table public.parents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text,
  capacity integer check (capacity is null or capacity > 0),
  active boolean not null default true,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  family_id text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.practices (
  id uuid primary key default gen_random_uuid(),
  practice_date date not null,
  start_time time not null,
  end_time time not null,
  location text not null,
  notes text not null default '',
  recurrence_group_id uuid,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table public.practice_children (
  practice_id uuid not null references public.practices(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  primary key (practice_id, child_id)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null unique references public.practices(id) on delete cascade,
  parent_id uuid not null references public.parents(id),
  calendar_event_id text not null unique,
  calendar_invite_status text not null default 'not_sent'
    check (calendar_invite_status in ('not_sent', 'sending', 'sent', 'generated', 'cancelled', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (practice_id, parent_id)
);

create index practices_date_idx on public.practices(practice_date);
create index assignments_parent_idx on public.assignments(parent_id);

alter table public.parents enable row level security;
alter table public.children enable row level security;
alter table public.practices enable row level security;
alter table public.practice_children enable row level security;
alter table public.assignments enable row level security;

create policy "Authenticated users can read parents"
  on public.parents for select to authenticated using (true);
create policy "Authenticated users can manage parents"
  on public.parents for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage children"
  on public.children for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage practices"
  on public.practices for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage practice children"
  on public.practice_children for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage assignments"
  on public.assignments for all to authenticated using (true) with check (true);
