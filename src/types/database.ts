// Database types for TeamSync

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH'
export type TaskStatus = 'ACTIVE' | 'DONE' | 'FAILED'

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  created_at: string
}

export interface Project {
  id: string
  name: string
  invite_code: string
  created_by: string
  created_at: string
}

export interface ProjectMember {
  project_id: string
  user_id: string
  role_titles: string[]  // Support multiple roles
  joined_at: string
}

export interface Section {
  id: string
  project_id: string
  name: string
  color: string
  order: number
  allowed_roles: string[]
  created_at: string
}

export interface Task {
  id: string
  project_id: string
  section_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  due_date: string | null
  deadline: string | null
  assigned_to: string | null
  assigned_to_list: string[]
  working_on_by: string[]
  working_on_started: string | null
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  task_id: string
  user_id: string
  user_name: string
  text: string
  timestamp: string
}
