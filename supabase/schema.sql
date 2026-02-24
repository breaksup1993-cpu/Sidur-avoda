-- ===========================
-- סידור עבודה – משמר אילת
-- Supabase SQL Schema
-- הרץ בSQL Editor של Supabase
-- ===========================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ===== PROFILES =====
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  name text not null,
  role text not null default 'employee' check (role in ('manager', 'shift_manager', 'employee')),
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup (optional, for manual creation we do it via API)
create or replace function handle_new_user()
returns trigger as $$
begin
  -- Profile is created by API, not auto-trigger
  return new;
end;
$$ language plpgsql security definer;

-- ===== WEEK REQUESTS =====
create table week_requests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  week_start date not null,
  selections jsonb not null default '[]',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  manager_note text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- Index for fast lookups
create index idx_week_requests_week on week_requests(week_start);
create index idx_week_requests_user on week_requests(user_id);
create index idx_week_requests_status on week_requests(status);

-- ===== WEEK DEADLINES =====
create table week_deadlines (
  id uuid default uuid_generate_v4() primary key,
  week_start date not null unique,
  deadline timestamptz not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ===== SWAP REQUESTS =====
create table swap_requests (
  id uuid default uuid_generate_v4() primary key,
  requester_id uuid references profiles(id) not null,
  target_id uuid references profiles(id) not null,
  requester_shift jsonb not null,
  target_shift jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'manager_approved', 'manager_rejected')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_swap_requests_requester on swap_requests(requester_id);
create index idx_swap_requests_target on swap_requests(target_id);
create index idx_swap_requests_status on swap_requests(status);

-- ===== DAILY BRIEFINGS =====
create table daily_briefings (
  id uuid default uuid_generate_v4() primary key,
  week_start date not null,
  day_index integer not null check (day_index >= 0 and day_index <= 6),
  briefing_person text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_start, day_index)
);

create index idx_daily_briefings_week on daily_briefings(week_start);

-- ===== MANUAL ASSIGNMENTS =====
create table manual_assignments (
  id uuid default uuid_generate_v4() primary key,
  week_start date not null,
  user_id uuid references profiles(id) on delete cascade not null,
  selections jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_start, user_id)
);

create index idx_manual_assignments_week on manual_assignments(week_start);
create index idx_manual_assignments_user on manual_assignments(user_id);

-- ===== ROW LEVEL SECURITY =====

alter table profiles enable row level security;
alter table week_requests enable row level security;
alter table week_deadlines enable row level security;
alter table swap_requests enable row level security;
alter table daily_briefings enable row level security;
alter table manual_assignments enable row level security;

-- Profiles: users see all profiles (for name display), only edit their own
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- Week requests: employees see own, managers see all
create policy "requests_select" on week_requests for select using (
  auth.uid() = user_id or
  exists (select 1 from profiles where id = auth.uid() and role = 'manager')
);
create policy "requests_insert_own" on week_requests for insert with check (auth.uid() = user_id);
create policy "requests_update_own_pending" on week_requests for update using (
  (auth.uid() = user_id and status = 'pending') or
  exists (select 1 from profiles where id = auth.uid() and role = 'manager')
);

-- Deadlines: all authenticated can read, only managers write
create policy "deadlines_select" on week_deadlines for select using (auth.role() = 'authenticated');
create policy "deadlines_write_manager" on week_deadlines for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'manager')
);

-- Swap requests: users see own + targeted at them, managers see all
create policy "swaps_select" on swap_requests for select using (
  auth.uid() = requester_id or
  auth.uid() = target_id or
  exists (select 1 from profiles where id = auth.uid() and role = 'manager')
);
create policy "swaps_insert" on swap_requests for insert with check (auth.uid() = requester_id);
create policy "swaps_update" on swap_requests for update using (
  auth.uid() = target_id or
  exists (select 1 from profiles where id = auth.uid() and role = 'manager')
);

-- Daily briefings: only managers can manage
create policy "briefings_select_all" on daily_briefings for select using (auth.role() = 'authenticated');
create policy "briefings_write_manager" on daily_briefings for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'manager')
);

-- Manual assignments: only managers can manage
create policy "manual_assignments_select_all" on manual_assignments for select using (auth.role() = 'authenticated');
create policy "manual_assignments_write_manager" on manual_assignments for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'manager')
);

-- ===== HELPFUL VIEWS =====

-- View: requests with user names (for manager)
create or replace view requests_with_names as
  select r.*, p.name as user_name, p.email as user_email
  from week_requests r
  join profiles p on r.user_id = p.id;

-- Grant access to authenticated users
grant select on requests_with_names to authenticated;

-- ===========================
-- הוראות לאחר הרצה:
-- 1. לך ל-Authentication → Users → Add User
-- 2. צור מנהל עם אימייל וסיסמה
-- 3. הרץ:
--    INSERT INTO profiles (id, email, name, role, must_change_password)
--    VALUES ('<UUID>', '<EMAIL>', '<NAME>', 'manager', false);
-- ===========================
