-- Create a table for public profiles using Supabase structure
create table profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint username_length check (char_length(username) >= 3)
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create projects table
create table projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  invite_code text unique default substring(gen_random_uuid()::text, 1, 5),
  created_by uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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


-- Create project_members table
create table project_members (
  project_id uuid references projects on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role_titles text[] default array['Member'],
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (project_id, user_id)
);

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


-- Create sections table
create table sections (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects on delete cascade,
  name text not null,
  color text default '#94a3b8',
  "order" integer not null default 0,
  allowed_roles text[] default array['Owner'],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table sections enable row level security;
-- Simplified RLS for demo
create policy "Enable all access for authenticated users" on sections for all using (auth.role() = 'authenticated');


-- Create tasks table
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

alter table tasks enable row level security;
create policy "Enable all access for authenticated users" on tasks for all using (auth.role() = 'authenticated');


-- Create task_comments table
create table task_comments (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks on delete cascade,
  user_id uuid references profiles(id),
  user_name text,
  text text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table task_comments enable row level security;
create policy "Enable all access for authenticated users" on task_comments for all using (auth.role() = 'authenticated');


-- Create project_roles table
create table project_roles (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects on delete cascade,
  name text not null,
  color text default '#3b82f6',
  permissions jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table project_roles enable row level security;
create policy "Enable all access for authenticated users" on project_roles for all using (auth.role() = 'authenticated');
