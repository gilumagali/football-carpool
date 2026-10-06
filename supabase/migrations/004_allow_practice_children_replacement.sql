create or replace function public.replace_carpool_data(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if not public.is_active_parent() then
    raise exception 'Only active parents can update this carpool.';
  end if;

  if coalesce(jsonb_typeof(payload -> 'parents'), '') <> 'array'
    or coalesce(jsonb_typeof(payload -> 'children'), '') <> 'array'
    or coalesce(jsonb_typeof(payload -> 'practices'), '') <> 'array'
    or coalesce(jsonb_typeof(payload -> 'assignments'), '') <> 'array'
  then
    raise exception 'Invalid carpool data.';
  end if;

  if not exists (
    select 1
    from jsonb_to_recordset(payload -> 'parents') as parent(
      id uuid,
      name text,
      email text,
      phone text,
      capacity integer,
      active boolean,
      created_at timestamptz
    )
    where lower(parent.email) = caller_email
      and parent.active = true
  ) then
    raise exception 'You cannot remove or deactivate your own parent account.';
  end if;

  insert into public.parents (id, name, email, phone, capacity, active, created_at)
  select id, name, lower(email), phone, capacity, active, created_at
  from jsonb_to_recordset(payload -> 'parents') as parent(
    id uuid,
    name text,
    email text,
    phone text,
    capacity integer,
    active boolean,
    created_at timestamptz
  )
  on conflict (id) do update
  set name = excluded.name,
      email = excluded.email,
      phone = excluded.phone,
      capacity = excluded.capacity,
      active = excluded.active;

  insert into public.children (id, name, family_id, active, created_at)
  select id, name, family_id, active, created_at
  from jsonb_to_recordset(payload -> 'children') as child(
    id uuid,
    name text,
    family_id text,
    active boolean,
    created_at timestamptz
  )
  on conflict (id) do update
  set name = excluded.name,
      family_id = excluded.family_id,
      active = excluded.active;

  insert into public.practices (
    id,
    practice_date,
    start_time,
    end_time,
    location,
    notes,
    recurrence_group_id,
    cancelled_at,
    created_at
  )
  select
    id,
    practice_date,
    start_time,
    end_time,
    location,
    notes,
    recurrence_group_id,
    cancelled_at,
    created_at
  from jsonb_to_recordset(payload -> 'practices') as practice(
    id uuid,
    practice_date date,
    start_time time,
    end_time time,
    location text,
    notes text,
    recurrence_group_id uuid,
    cancelled_at timestamptz,
    created_at timestamptz,
    child_ids jsonb
  )
  on conflict (id) do update
  set practice_date = excluded.practice_date,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      location = excluded.location,
      notes = excluded.notes,
      recurrence_group_id = excluded.recurrence_group_id,
      cancelled_at = excluded.cancelled_at;

  delete from public.practice_children
  where true;

  insert into public.practice_children (practice_id, child_id)
  select practice.id, child_id::uuid
  from jsonb_to_recordset(payload -> 'practices') as practice(
    id uuid,
    practice_date date,
    start_time time,
    end_time time,
    location text,
    notes text,
    recurrence_group_id uuid,
    cancelled_at timestamptz,
    created_at timestamptz,
    child_ids jsonb
  )
  cross join lateral jsonb_array_elements_text(
    coalesce(practice.child_ids, '[]'::jsonb)
  ) as child(child_id);

  delete from public.assignments existing
  where not exists (
    select 1
    from jsonb_to_recordset(payload -> 'assignments') as assignment(id uuid)
    where assignment.id = existing.id
  );

  insert into public.assignments (
    id,
    practice_id,
    parent_id,
    calendar_event_id,
    calendar_invite_status,
    created_at,
    updated_at
  )
  select
    id,
    practice_id,
    parent_id,
    calendar_event_id,
    calendar_invite_status,
    created_at,
    updated_at
  from jsonb_to_recordset(payload -> 'assignments') as assignment(
    id uuid,
    practice_id uuid,
    parent_id uuid,
    calendar_event_id text,
    calendar_invite_status text,
    created_at timestamptz,
    updated_at timestamptz
  )
  on conflict (id) do update
  set practice_id = excluded.practice_id,
      parent_id = excluded.parent_id,
      calendar_event_id = excluded.calendar_event_id,
      calendar_invite_status = excluded.calendar_invite_status,
      updated_at = excluded.updated_at;

  delete from public.practices existing
  where not exists (
    select 1
    from jsonb_to_recordset(payload -> 'practices') as practice(id uuid)
    where practice.id = existing.id
  );

  delete from public.children existing
  where not exists (
    select 1
    from jsonb_to_recordset(payload -> 'children') as child(id uuid)
    where child.id = existing.id
  );

  delete from public.parents existing
  where not exists (
    select 1
    from jsonb_to_recordset(payload -> 'parents') as parent(id uuid)
    where parent.id = existing.id
  );
end;
$$;

revoke all on function public.replace_carpool_data(jsonb) from public;
grant execute on function public.replace_carpool_data(jsonb) to authenticated;
