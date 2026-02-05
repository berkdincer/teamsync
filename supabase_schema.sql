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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint username_length check (char_length(username) >= 3)
);


-- ============================================
-- 2. PROJECTS TABLE (without RLS that depends on project_members)
-- ============================================
create table projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  invite_code text unique default substring(gen_random_uuid()::text, 1, 5),
  created_by uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- ============================================
-- 3. PROJECT MEMBERS TABLE
-- ============================================
create table project_members (
  project_id uuid references projects on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role_titles text[] default array['Member'],
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (project_id, user_id)
);


-- ============================================
-- 4. PROJECT ROLES TABLE
-- ============================================
create table project_roles (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects on delete cascade,
  name text not null,
  color text default '#3b82f6',
  permissions jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- ============================================
-- 5. SECTIONS TABLE
-- ============================================
create table sections (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects on delete cascade,
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
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects on delete cascade,
  section_id uuid references sections on delete cascade,
  title text not null,
  description text,
  status text default 'ACTIVE',
  priority text default 'MEDIUM',
  due_date timestamp with time zone,
  deadline timestamp with time zone,
  assigned_to uuid references profiles(id),
  assigned_to_list uuid[] default array[]::uuid[],
  working_on_by uuid[] default array[]::uuid[],
  working_on_started timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- ============================================
-- 7. TASK COMMENTS TABLE
-- ============================================
create table task_comments (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks on delete cascade,
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

-- Projects RLS (now project_members exists)
alter table projects enable row level security;

create policy "Projects are viewable by members" on projects
  for select using (
    exists (
      select 1 from project_members
      where project_members.project_id = projects.id
      and project_members.user_id = auth.uid()
    )
    or created_by = auth.uid()
  );

create policy "Users can create projects" on projects
  for insert with check (auth.uid() = created_by);
  
create policy "Users can update their own projects" on projects
  for update using (created_by = auth.uid());

create policy "Users can delete their own projects" on projects
  for delete using (created_by = auth.uid());

-- Project Members RLS
alter table project_members enable row level security;

create policy "Members are viewable by project members" on project_members
  for select using (
    exists (
      select 1 from project_members pm
      where pm.project_id = project_members.project_id
      and pm.user_id = auth.uid()
    )
    or exists (
      select 1 from projects p
      where p.id = project_members.project_id
      and p.created_by = auth.uid()
    )
  );
  
create policy "Users can join projects" on project_members
  for insert with check (auth.uid() = user_id);

create policy "Project owners can update members" on project_members
  for update using (
    exists (
      select 1 from projects p
      where p.id = project_members.project_id
      and p.created_by = auth.uid()
    )
  );

create policy "Project owners can delete members" on project_members
  for delete using (
    exists (
      select 1 from projects p
      where p.id = project_members.project_id
      and p.created_by = auth.uid()
    )
  );

-- Project Roles RLS
alter table project_roles enable row level security;
create policy "Enable all access for authenticated users" on project_roles 
  for all using (auth.role() = 'authenticated');

-- Sections RLS
alter table sections enable row level security;
create policy "Enable all access for authenticated users" on sections 
  for all using (auth.role() = 'authenticated');

-- Tasks RLS
alter table tasks enable row level security;
create policy "Enable all access for authenticated users" on tasks 
  for all using (auth.role() = 'authenticated');

-- Task Comments RLS
alter table task_comments enable row level security;
create policy "Enable all access for authenticated users" on task_comments 
  for all using (auth.role() = 'authenticated');


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
