-- ============================================
-- TeamSync Complete Supabase Schema
-- ============================================
-- Run this SQL in Supabase SQL Editor to set up the database
-- WARNING: This will DROP existing tables if they exist!
-- ============================================

-- Drop existing objects (in correct order due to dependencies)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists task_comments cascade;
drop table if exists tasks cascade;
drop table if exists sections cascade;
drop table if exists project_members cascade;
drop table if exists project_roles cascade;
drop table if exists projects cascade;
drop table if exists profiles cascade;


-- ============================================
-- 1. PROFILES TABLE
-- ============================================
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- ============================================
-- 2. PROJECTS TABLE
-- ============================================
create table projects (
  id text primary key,
  name text not null,
  invite_code text unique,
  created_by uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- ============================================
-- 3. PROJECT MEMBERS TABLE
-- ============================================
create table project_members (
  project_id text references projects(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role_titles text[] default array['Member'],
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (project_id, user_id)
);


-- ============================================
-- 4. PROJECT ROLES TABLE
-- ============================================
create table project_roles (
  id text primary key,
  project_id text references projects(id) on delete cascade,
  name text not null,
  color text default '#3b82f6',
  permissions jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- ============================================
-- 5. SECTIONS TABLE
-- ============================================
create table sections (
  id text primary key,
  project_id text references projects(id) on delete cascade,
  name text not null,
  color text default '#94a3b8',
  "order" integer not null default 0,
  allowed_roles text[] default array['Owner'],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- ============================================
-- 6. TASKS TABLE
-- ============================================
create table tasks (
  id text primary key,
  project_id text references projects(id) on delete cascade,
  section_id text references sections(id) on delete cascade,
  title text not null,
  description text,
  status text default 'ACTIVE',
  priority text default 'MEDIUM',
  due_date timestamp with time zone,
  deadline timestamp with time zone,
  assigned_to uuid references profiles(id),
  assigned_to_list text[] default array[]::text[],
  working_on_by text[] default array[]::text[],
  working_on_started timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- ============================================
-- 7. TASK COMMENTS TABLE
-- ============================================
create table task_comments (
  id text primary key,
  task_id text references tasks(id) on delete cascade,
  user_id uuid references profiles(id),
  user_name text,
  text text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);


-- ============================================
-- 8. AUTO-CREATE PROFILE TRIGGER
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, username, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Profiles RLS
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Projects RLS
alter table projects enable row level security;

create policy "Enable all access for authenticated users" on projects
  for all using (auth.uid() is not null);

-- Project Members RLS
alter table project_members enable row level security;

create policy "Enable all access for authenticated users" on project_members
  for all using (auth.uid() is not null);

-- Project Roles RLS
alter table project_roles enable row level security;
create policy "Enable all access for authenticated users" on project_roles 
  for all using (auth.uid() is not null);

-- Sections RLS
alter table sections enable row level security;
create policy "Enable all access for authenticated users" on sections 
  for all using (auth.uid() is not null);

-- Tasks RLS
alter table tasks enable row level security;
create policy "Enable all access for authenticated users" on tasks 
  for all using (auth.uid() is not null);

-- Task Comments RLS
alter table task_comments enable row level security;
create policy "Enable all access for authenticated users" on task_comments 
  for all using (auth.uid() is not null);


-- ============================================
-- 10. INDEXES FOR PERFORMANCE
-- ============================================
create index if not exists idx_tasks_project_id on tasks(project_id);
create index if not exists idx_tasks_section_id on tasks(section_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_sections_project_id on sections(project_id);
create index if not exists idx_project_members_project_id on project_members(project_id);
create index if not exists idx_project_members_user_id on project_members(user_id);
create index if not exists idx_task_comments_task_id on task_comments(task_id);
create index if not exists idx_project_roles_project_id on project_roles(project_id);


-- ============================================
-- DONE!
-- ============================================
