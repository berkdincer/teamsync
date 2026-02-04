// TeamSync Store - Complete Project Management
import type { User, Project, ProjectMember, Task, Comment, Priority, TaskStatus } from '@/types/database'

const generateId = () => Math.random().toString(36).substring(2, 15)

// Extended types
export interface Section {
  id: string
  project_id: string
  name: string
  color: string
  order: number
  allowed_roles: string[] // Roles that can edit tasks in this section
  created_at: string
}

export interface ExtendedTask extends Task {
  section_id: string
  deadline: string | null
  assigned_to_list: string[] // Multiple assignees support
}

export interface ExtendedUser extends User {
  username: string
  surname: string
  streak: number
  last_active: string
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  user_name: string
  text: string
  timestamp: string
}

export interface RolePermissions {
  is_admin: boolean      // Full admin - covers ALL permissions
  can_invite: boolean    // Can create invitations
  can_add_section: boolean // Can add topics/sections
  can_delete_member: boolean // Can remove members
  can_delete_task: boolean // Can delete tasks
  can_edit_roles: boolean // Can edit role permissions
}

export interface ProjectRole {
  id: string
  project_id: string
  name: string
  color: string
  permissions: RolePermissions
  created_at: string
}

export const DEFAULT_PERMISSIONS: RolePermissions = {
  is_admin: false,
  can_invite: false,
  can_add_section: false,
  can_delete_member: false,
  can_delete_task: false,
  can_edit_roles: false,
}

export const ADMIN_PERMISSIONS: RolePermissions = {
  is_admin: true,
  can_invite: true,
  can_add_section: true,
  can_delete_member: true,
  can_delete_task: true,
  can_edit_roles: true,
}

// Auth state
let isAuthenticated = false
let currentUserId: string | null = null
let isDarkMode = true

// Demo data
const users: ExtendedUser[] = [
  { id: 'user-1', email: 'berk@teamsync.io', full_name: 'Berk', surname: 'Yilmaz', username: 'berkyilmaz', avatar_url: null, created_at: new Date().toISOString(), streak: 15, last_active: new Date().toISOString() },
  { id: 'user-2', email: 'can@teamsync.io', full_name: 'Can', surname: 'Ozturk', username: 'canozturk', avatar_url: null, created_at: new Date().toISOString(), streak: 8, last_active: new Date().toISOString() },
  { id: 'user-3', email: 'john@teamsync.io', full_name: 'John', surname: 'Smith', username: 'johnsmith', avatar_url: null, created_at: new Date().toISOString(), streak: 3, last_active: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'user-4', email: 'sarah@teamsync.io', full_name: 'Sarah', surname: 'Wilson', username: 'sarahwilson', avatar_url: null, created_at: new Date().toISOString(), streak: 21, last_active: new Date().toISOString() },
]

// Default roles that can be used as templates
export const DEFAULT_ROLE_TEMPLATES = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'UI Designer',
  'DevOps Engineer',
  'ML Engineer',
  'QA Tester',
  'Project Manager',
  'Member'
]

// Project-specific roles
const projectRoles: ProjectRole[] = [
  { id: 'role-1', project_id: 'project-1', name: 'Owner', color: '#f59e0b', permissions: ADMIN_PERMISSIONS, created_at: new Date().toISOString() },
  { id: 'role-2', project_id: 'project-1', name: 'Frontend Developer', color: '#10b981', permissions: { ...DEFAULT_PERMISSIONS, can_add_section: true }, created_at: new Date().toISOString() },
  { id: 'role-3', project_id: 'project-1', name: 'Backend Developer', color: '#3b82f6', permissions: { ...DEFAULT_PERMISSIONS, can_add_section: true }, created_at: new Date().toISOString() },
  { id: 'role-4', project_id: 'project-1', name: 'Full Stack Developer', color: '#8b5cf6', permissions: { ...DEFAULT_PERMISSIONS, can_add_section: true, can_invite: true }, created_at: new Date().toISOString() },
  { id: 'role-5', project_id: 'project-1', name: 'UI Designer', color: '#ec4899', permissions: DEFAULT_PERMISSIONS, created_at: new Date().toISOString() },
  { id: 'role-6', project_id: 'project-1', name: 'DevOps Engineer', color: '#06b6d4', permissions: { ...DEFAULT_PERMISSIONS, can_delete_task: true }, created_at: new Date().toISOString() },
  { id: 'role-7', project_id: 'project-2', name: 'Owner', color: '#f59e0b', permissions: ADMIN_PERMISSIONS, created_at: new Date().toISOString() },
  { id: 'role-8', project_id: 'project-2', name: 'UI Designer', color: '#ec4899', permissions: DEFAULT_PERMISSIONS, created_at: new Date().toISOString() },
  { id: 'role-9', project_id: 'project-2', name: 'Developer', color: '#3b82f6', permissions: DEFAULT_PERMISSIONS, created_at: new Date().toISOString() },
  { id: 'role-10', project_id: 'project-3', name: 'Owner', color: '#f59e0b', permissions: ADMIN_PERMISSIONS, created_at: new Date().toISOString() },
  { id: 'role-11', project_id: 'project-3', name: 'ML Engineer', color: '#ef4444', permissions: DEFAULT_PERMISSIONS, created_at: new Date().toISOString() },
]

const projects: Project[] = [
  { id: 'project-1', name: 'E-Commerce Platform', invite_code: 'ecom1', created_by: 'user-1', created_at: new Date().toISOString() },
  { id: 'project-2', name: 'Mobile App Redesign', invite_code: 'mobi2', created_by: 'user-2', created_at: new Date().toISOString() },
  { id: 'project-3', name: 'AI Chatbot', invite_code: 'aich3', created_by: 'user-1', created_at: new Date().toISOString() },
]

const members: ProjectMember[] = [
  { project_id: 'project-1', user_id: 'user-1', role_titles: ['Owner'], joined_at: new Date().toISOString() },
  { project_id: 'project-1', user_id: 'user-2', role_titles: ['Frontend Developer', 'UI Designer'], joined_at: new Date().toISOString() },
  { project_id: 'project-1', user_id: 'user-3', role_titles: ['Backend Developer'], joined_at: new Date().toISOString() },
  { project_id: 'project-2', user_id: 'user-2', role_titles: ['Owner'], joined_at: new Date().toISOString() },
  { project_id: 'project-2', user_id: 'user-1', role_titles: ['UI Designer', 'Developer'], joined_at: new Date().toISOString() },
  { project_id: 'project-3', user_id: 'user-1', role_titles: ['Owner'], joined_at: new Date().toISOString() },
  { project_id: 'project-3', user_id: 'user-4', role_titles: ['ML Engineer'], joined_at: new Date().toISOString() },
]

const sections: Section[] = [
  { id: 'sec-1', project_id: 'project-1', name: 'Backend', color: '#3b82f6', order: 0, allowed_roles: ['Owner', 'Backend Developer', 'Full Stack Developer'], created_at: new Date().toISOString() },
  { id: 'sec-2', project_id: 'project-1', name: 'Frontend', color: '#10b981', order: 1, allowed_roles: ['Owner', 'Frontend Developer', 'Full Stack Developer', 'UI Designer'], created_at: new Date().toISOString() },
  { id: 'sec-3', project_id: 'project-1', name: 'DevOps', color: '#f59e0b', order: 2, allowed_roles: ['Owner', 'DevOps Engineer'], created_at: new Date().toISOString() },
  { id: 'sec-4', project_id: 'project-2', name: 'Design', color: '#ec4899', order: 0, allowed_roles: ['Owner', 'UI Designer'], created_at: new Date().toISOString() },
  { id: 'sec-5', project_id: 'project-2', name: 'Development', color: '#8b5cf6', order: 1, allowed_roles: ['Owner', 'Developer'], created_at: new Date().toISOString() },
  { id: 'sec-6', project_id: 'project-3', name: 'Research', color: '#06b6d4', order: 0, allowed_roles: ['Owner', 'ML Engineer'], created_at: new Date().toISOString() },
  { id: 'sec-7', project_id: 'project-3', name: 'Training', color: '#ef4444', order: 1, allowed_roles: ['Owner', 'ML Engineer'], created_at: new Date().toISOString() },
]

const tasks: ExtendedTask[] = [
  { id: 'task-1', project_id: 'project-1', section_id: 'sec-1', title: 'Setup PostgreSQL database', description: 'Initialize the database with proper schemas', status: 'DONE', priority: 'HIGH', due_date: null, deadline: '2026-02-10', assigned_to: 'user-3', assigned_to_list: ['user-3'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'task-2', project_id: 'project-1', section_id: 'sec-1', title: 'Create REST API endpoints', description: 'Build CRUD endpoints for products', status: 'ACTIVE', priority: 'HIGH', due_date: new Date(Date.now() + 86400000 * 3).toISOString(), deadline: '2026-02-15', assigned_to: 'user-3', assigned_to_list: ['user-3', 'user-1'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'task-3', project_id: 'project-1', section_id: 'sec-1', title: 'Implement authentication', description: 'JWT-based auth system', status: 'ACTIVE', priority: 'MEDIUM', due_date: null, deadline: '2026-02-20', assigned_to: 'user-3', assigned_to_list: ['user-3'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'task-4', project_id: 'project-1', section_id: 'sec-2', title: 'Build product listing page', description: null, status: 'ACTIVE', priority: 'HIGH', due_date: new Date(Date.now() + 86400000 * 5).toISOString(), deadline: '2026-02-18', assigned_to: 'user-2', assigned_to_list: ['user-2'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'task-5', project_id: 'project-1', section_id: 'sec-2', title: 'Shopping cart UI', description: 'Implement cart with animations', status: 'ACTIVE', priority: 'MEDIUM', due_date: null, deadline: null, assigned_to: 'user-2', assigned_to_list: ['user-2', 'user-1'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'task-6', project_id: 'project-1', section_id: 'sec-3', title: 'Setup CI/CD pipeline', description: null, status: 'DONE', priority: 'LOW', due_date: null, deadline: '2026-02-05', assigned_to: 'user-1', assigned_to_list: ['user-1'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'task-7', project_id: 'project-2', section_id: 'sec-4', title: 'Create design system', description: null, status: 'ACTIVE', priority: 'HIGH', due_date: null, deadline: '2026-02-25', assigned_to: 'user-1', assigned_to_list: ['user-1'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'task-8', project_id: 'project-3', section_id: 'sec-6', title: 'Research LLM models', description: null, status: 'DONE', priority: 'HIGH', due_date: null, deadline: null, assigned_to: 'user-4', assigned_to_list: ['user-4'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

// Mock comments for tasks
const taskComments: TaskComment[] = [
  { id: 'comment-1', task_id: 'task-2', user_id: 'user-1', user_name: 'Berk', text: 'I started working on this. Will update soon.', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: 'comment-2', task_id: 'task-2', user_id: 'user-3', user_name: 'John', text: 'Okay, let me know if you need any help with the database schemas.', timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: 'comment-3', task_id: 'task-2', user_id: 'user-1', user_name: 'Berk', text: 'Thanks! I might need help with the authentication endpoints.', timestamp: new Date(Date.now() - 900000).toISOString() },
  { id: 'comment-4', task_id: 'task-4', user_id: 'user-2', user_name: 'Can', text: 'Design mockups are ready. Starting implementation now.', timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: 'comment-5', task_id: 'task-4', user_id: 'user-1', user_name: 'Berk', text: 'Great! The API will be ready by tomorrow.', timestamp: new Date(Date.now() - 3600000).toISOString() },
]

// Role colors for new roles
const ROLE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6']

class Store {
  private listeners: Set<() => void> = new Set()
  private currentProjectId: string | null = 'project-1'

  subscribe(callback: () => void) {
    this.listeners.add(callback)
    return () => { this.listeners.delete(callback) }
  }

  private notify() {
    this.listeners.forEach(cb => cb())
  }

  // ============ DARK MODE ============
  isDarkMode(): boolean {
    return isDarkMode
  }

  toggleDarkMode() {
    isDarkMode = !isDarkMode
    this.notify()
  }

  // ============ AUTH ============
  isAuthenticated(): boolean {
    return isAuthenticated
  }

  login(email: string, password: string): ExtendedUser | null {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (user) {
      isAuthenticated = true
      currentUserId = user.id
      this.updateStreak(user.id)
      this.notify()
      return user
    }
    return null
  }

  register(name: string, surname: string, username: string, email: string, password: string): ExtendedUser {
    const newUser: ExtendedUser = {
      id: generateId(),
      email,
      full_name: name,
      surname,
      username,
      avatar_url: null,
      created_at: new Date().toISOString(),
      streak: 1,
      last_active: new Date().toISOString(),
    }
    users.push(newUser)
    isAuthenticated = true
    currentUserId = newUser.id
    this.notify()
    return newUser
  }

  logout() {
    isAuthenticated = false
    currentUserId = null
    this.notify()
  }

  getCurrentUser(): ExtendedUser | null {
    if (!currentUserId) return null
    return users.find(u => u.id === currentUserId) || null
  }

  getUsers(): ExtendedUser[] {
    return users
  }

  getUserById(userId: string): ExtendedUser | undefined {
    return users.find(u => u.id === userId)
  }

  // ============ STREAK SYSTEM ============
  updateStreak(userId: string) {
    const userIdx = users.findIndex(u => u.id === userId)
    if (userIdx === -1) return

    const user = users[userIdx]
    const lastActive = new Date(user.last_active)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      // Same day
    } else if (diffDays === 1) {
      users[userIdx].streak += 1
    } else {
      users[userIdx].streak = 1
    }
    
    users[userIdx].last_active = now.toISOString()
  }

  isUserOnline(userId: string): boolean {
    const user = users.find(u => u.id === userId)
    if (!user) return false
    const lastActive = new Date(user.last_active)
    const now = new Date()
    const diffMinutes = (now.getTime() - lastActive.getTime()) / (1000 * 60)
    return diffMinutes < 5
  }

  getUserStreak(userId: string): number {
    const user = users.find(u => u.id === userId)
    return user?.streak || 0
  }

  // ============ PROJECT ROLES ============
  getProjectRoles(projectId?: string): ProjectRole[] {
    const pid = projectId || this.currentProjectId
    if (!pid) return []
    return projectRoles.filter(r => r.project_id === pid)
  }

  getAvailableRoleNames(projectId?: string): string[] {
    const roles = this.getProjectRoles(projectId)
    return roles.map(r => r.name)
  }

  addProjectRole(name: string, color?: string, permissions?: Partial<RolePermissions>): ProjectRole | null {
    if (!this.currentProjectId) return null
    const existing = projectRoles.find(r => r.project_id === this.currentProjectId && r.name.toLowerCase() === name.toLowerCase())
    if (existing) return existing

    const randomColor = color || ROLE_COLORS[Math.floor(Math.random() * ROLE_COLORS.length)]
    const newRole: ProjectRole = {
      id: generateId(),
      project_id: this.currentProjectId,
      name,
      color: randomColor,
      permissions: { ...DEFAULT_PERMISSIONS, ...permissions },
      created_at: new Date().toISOString(),
    }
    projectRoles.push(newRole)
    this.notify()
    return newRole
  }

  updateRolePermissions(roleId: string, permissions: Partial<RolePermissions>) {
    const idx = projectRoles.findIndex(r => r.id === roleId)
    if (idx !== -1 && projectRoles[idx].name !== 'Owner') {
      // If setting is_admin to true, enable all permissions
      if (permissions.is_admin) {
        projectRoles[idx].permissions = { ...ADMIN_PERMISSIONS }
      } else {
        projectRoles[idx].permissions = { ...projectRoles[idx].permissions, ...permissions }
        // If is_admin is explicitly false, make sure it stays false
        if (permissions.is_admin === false) {
          projectRoles[idx].permissions.is_admin = false
        }
      }
      this.notify()
    }
  }

  // Get current user's role in the project
  getCurrentUserRole(): ProjectRole | null {
    if (!currentUserId || !this.currentProjectId) return null
    const membership = members.find(m => m.project_id === this.currentProjectId && m.user_id === currentUserId)
    if (!membership) return null
    return projectRoles.find(r => r.project_id === this.currentProjectId && membership.role_titles.includes(r.name)) || null
  }

  // Check if current user has a specific permission
  hasPermission(permission: keyof RolePermissions): boolean {
    if (!currentUserId || !this.currentProjectId) return false
    const project = projects.find(p => p.id === this.currentProjectId)
    // Owner always has all permissions
    if (project?.created_by === currentUserId) return true
    
    const role = this.getCurrentUserRole()
    if (!role) return false
    // Admin has all permissions
    if (role.permissions.is_admin) return true
    return role.permissions[permission] || false
  }

  canCurrentUserInvite(): boolean {
    return this.hasPermission('can_invite')
  }

  canCurrentUserDeleteTask(): boolean {
    return this.hasPermission('can_delete_task')
  }

  canCurrentUserDeleteMember(): boolean {
    return this.hasPermission('can_delete_member')
  }

  canCurrentUserAddSection(): boolean {
    return this.hasPermission('can_add_section')
  }

  canCurrentUserEditRoles(): boolean {
    return this.hasPermission('can_edit_roles')
  }

  // Legacy - kept for backward compatibility
  canCurrentUserDelete(): boolean {
    return this.canCurrentUserDeleteTask()
  }

  // Search tasks across all sections in current project
  searchTasks(query: string): (ExtendedTask & { assignees: (ExtendedUser & { role_titles: string[] })[], sectionName: string, sectionColor: string })[] {
    if (!query.trim() || !this.currentProjectId) return []
    const q = query.toLowerCase()
    const projectSections = sections.filter(s => s.project_id === this.currentProjectId)
    
    return tasks
      .filter(t => t.project_id === this.currentProjectId)
      .filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.description?.toLowerCase().includes(q) ||
        (t.assigned_to_list || []).some(userId => {
          const user = users.find(u => u.id === userId)
          return user?.full_name.toLowerCase().includes(q) || user?.username.toLowerCase().includes(q)
        })
      )
      .map(t => {
        const section = projectSections.find(s => s.id === t.section_id)
        return {
          ...t,
          sectionName: section?.name || '',
          sectionColor: section?.color || '#6366f1',
          assignees: (t.assigned_to_list || []).map(userId => ({
            ...users.find(u => u.id === userId)!,
            role_titles: members.find(m => m.project_id === t.project_id && m.user_id === userId)?.role_titles || [],
          })).filter(a => a.id),
        }
      })
  }

  deleteProjectRole(roleId: string) {
    const idx = projectRoles.findIndex(r => r.id === roleId)
    if (idx === -1) return
    const role = projectRoles[idx]
    if (role.name === 'Owner') return // Can't delete Owner role
    
    const deletedRoleName = role.name
    const projectId = role.project_id
    
    projectRoles.splice(idx, 1)
    
    // Remove deleted role from members
    members.forEach(m => {
      if (m.project_id === projectId) {
        const idx = m.role_titles.indexOf(deletedRoleName)
        if (idx !== -1) {
          m.role_titles.splice(idx, 1)
          // If no roles left, assign 'Member'
          if (m.role_titles.length === 0) {
            m.role_titles.push('Member')
          }
        }
      }
    })
    
    // Remove deleted role from section allowed_roles
    sections.forEach(s => {
      if (s.project_id === projectId && s.allowed_roles.includes(deletedRoleName)) {
        s.allowed_roles = s.allowed_roles.filter(r => r !== deletedRoleName)
      }
    })
    
    this.notify()
  }

  // ============ ROLE PERMISSIONS ============
  getCurrentUserRoleNames(): string[] {
    if (!currentUserId || !this.currentProjectId) return []
    const membership = members.find(m => m.project_id === this.currentProjectId && m.user_id === currentUserId)
    return membership?.role_titles || []
  }

  canEditSection(sectionId: string): boolean {
    const section = sections.find(s => s.id === sectionId)
    if (!section) return false
    
    const userRoles = this.getCurrentUserRoleNames()
    if (userRoles.includes('Owner')) return true // Owner can always edit
    
    return userRoles.some(role => section.allowed_roles.includes(role))
  }

  getSectionAllowedRolesText(sectionId: string): string {
    const section = sections.find(s => s.id === sectionId)
    if (!section) return ''
    const roles = section.allowed_roles.filter(r => r !== 'Owner')
    if (roles.length === 0) return 'Only Owner'
    return roles.join(', ')
  }

  // ============ PROJECTS ============
  getMyProjects(): (Project & { role: string; isOwner: boolean })[] {
    if (!currentUserId) return []
    return members
      .filter(m => m.user_id === currentUserId)
      .map(m => {
        const project = projects.find(p => p.id === m.project_id)!
        return {
          ...project,
          role: m.role_titles.join(', '),
          isOwner: project.created_by === currentUserId,
        }
      })
  }

  getCurrentProject(): (Project & { role: string; isOwner: boolean }) | null {
    if (!this.currentProjectId || !currentUserId) return null
    const project = projects.find(p => p.id === this.currentProjectId)
    if (!project) return null
    const membership = members.find(m => m.project_id === this.currentProjectId && m.user_id === currentUserId)
    if (!membership) return null
    return {
      ...project,
      role: membership.role_titles.join(', '),
      isOwner: project.created_by === currentUserId,
    }
  }

  setCurrentProject(projectId: string) {
    this.currentProjectId = projectId
    this.notify()
  }

  createProject(name: string): Project {
    const projectId = generateId()
    const project: Project = {
      id: projectId,
      name,
      invite_code: generateId().substring(0, 5),
      created_by: currentUserId!,
      created_at: new Date().toISOString(),
    }
    projects.push(project)
    
    projectRoles.push({ id: generateId(), project_id: projectId, name: 'Owner', color: '#f59e0b', permissions: ADMIN_PERMISSIONS, created_at: new Date().toISOString() })
    projectRoles.push({ id: generateId(), project_id: projectId, name: 'Member', color: '#6b7280', permissions: DEFAULT_PERMISSIONS, created_at: new Date().toISOString() })
    
    members.push({ project_id: project.id, user_id: currentUserId!, role_titles: ['Owner'], joined_at: new Date().toISOString() })
    this.currentProjectId = project.id
    this.notify()
    return project
  }

  joinProject(inviteCode: string): boolean {
    const project = projects.find(p => p.invite_code === inviteCode)
    if (!project || !currentUserId) return false
    const existing = members.find(m => m.project_id === project.id && m.user_id === currentUserId)
    if (existing) return true
    members.push({ project_id: project.id, user_id: currentUserId, role_titles: ['Member'], joined_at: new Date().toISOString() })
    this.notify()
    return true
  }

  deleteProject(projectId: string): boolean {
    const project = projects.find(p => p.id === projectId)
    if (!project) return false
    
    // Only the creator/owner can delete the project
    if (project.created_by !== currentUserId) return false
    
    // Delete all tasks in this project
    for (let i = tasks.length - 1; i >= 0; i--) {
      if (tasks[i].project_id === projectId) {
        // Also delete comments for these tasks
        for (let j = taskComments.length - 1; j >= 0; j--) {
          if (taskComments[j].task_id === tasks[i].id) {
            taskComments.splice(j, 1)
          }
        }
        tasks.splice(i, 1)
      }
    }
    
    // Delete all sections in this project
    for (let i = sections.length - 1; i >= 0; i--) {
      if (sections[i].project_id === projectId) {
        sections.splice(i, 1)
      }
    }
    
    // Delete all members from this project
    for (let i = members.length - 1; i >= 0; i--) {
      if (members[i].project_id === projectId) {
        members.splice(i, 1)
      }
    }
    
    // Delete all roles for this project
    for (let i = projectRoles.length - 1; i >= 0; i--) {
      if (projectRoles[i].project_id === projectId) {
        projectRoles.splice(i, 1)
      }
    }
    
    // Delete the project itself
    const projectIdx = projects.findIndex(p => p.id === projectId)
    if (projectIdx !== -1) {
      projects.splice(projectIdx, 1)
    }
    
    // If this was the current project, switch to another one or null
    if (this.currentProjectId === projectId) {
      const myProjects = this.getMyProjects()
      this.currentProjectId = myProjects.length > 0 ? myProjects[0].id : null
    }
    
    this.notify()
    return true
  }

  leaveProject(projectId: string): boolean {
    if (!currentUserId) return false
    
    const project = projects.find(p => p.id === projectId)
    if (!project) return false
    
    // Owners cannot leave - they must delete the project
    if (project.created_by === currentUserId) return false
    
    // Remove the current user from project members
    const memberIdx = members.findIndex(m => m.project_id === projectId && m.user_id === currentUserId)
    if (memberIdx !== -1) {
      members.splice(memberIdx, 1)
    }
    
    // Unassign the user from all tasks in this project
    const userId = currentUserId!
    tasks.forEach(task => {
      if (task.project_id === projectId) {
        const assigneeIdx = task.assigned_to_list.indexOf(userId)
        if (assigneeIdx !== -1) {
          task.assigned_to_list.splice(assigneeIdx, 1)
        }
      }
    })
    
    // If this was the current project, switch to another one
    if (this.currentProjectId === projectId) {
      const myProjects = this.getMyProjects()
      this.currentProjectId = myProjects.length > 0 ? myProjects[0].id : null
    }
    
    this.notify()
    return true
  }

  getInviteCode(): string {
    const project = this.getCurrentProject()
    return project?.invite_code || ''
  }

  // ============ MEMBERS ============
  getProjectMembers(projectId?: string): (ProjectMember & { user: ExtendedUser })[] {
    const pid = projectId || this.currentProjectId
    if (!pid) return []
    return members
      .filter(m => m.project_id === pid)
      .map(m => ({ ...m, user: users.find(u => u.id === m.user_id)! }))
  }

  getMemberRoles(userId: string, projectId?: string): string[] {
    const pid = projectId || this.currentProjectId
    const member = members.find(m => m.project_id === pid && m.user_id === userId)
    return member?.role_titles || []
  }

  // Toggle a role for a member (add if not present, remove if present)
  toggleMemberRole(userId: string, roleTitle: string) {
    const idx = members.findIndex(m => m.project_id === this.currentProjectId && m.user_id === userId)
    if (idx === -1) return
    
    const project = projects.find(p => p.id === this.currentProjectId)
    // Owner role cannot be removed from the creator
    if (project && project.created_by === userId && roleTitle === 'Owner') {
      return
    }
    
    const roleIdx = members[idx].role_titles.indexOf(roleTitle)
    if (roleIdx === -1) {
      // Add role
      members[idx].role_titles.push(roleTitle)
    } else {
      // Remove role (but keep at least one role)
      if (members[idx].role_titles.length > 1) {
        members[idx].role_titles.splice(roleIdx, 1)
      }
    }
    this.notify()
  }

  // Set member roles (replace all roles)
  setMemberRoles(userId: string, roleTitles: string[]) {
    const idx = members.findIndex(m => m.project_id === this.currentProjectId && m.user_id === userId)
    if (idx === -1) return
    
    const project = projects.find(p => p.id === this.currentProjectId)
    // Owner must keep Owner role
    if (project && project.created_by === userId) {
      if (!roleTitles.includes('Owner')) {
        roleTitles.unshift('Owner')
      }
    }
    
    members[idx].role_titles = roleTitles.length > 0 ? roleTitles : ['Member']
    this.notify()
  }

  // Legacy function - kept for compatibility
  updateMemberRole(userId: string, roleTitle: string) {
    this.setMemberRoles(userId, [roleTitle])
  }

  removeMember(userId: string) {
    const project = projects.find(p => p.id === this.currentProjectId)
    if (!project) return
    if (project.created_by === userId) return
    
    const idx = members.findIndex(m => m.project_id === this.currentProjectId && m.user_id === userId)
    if (idx !== -1) {
      members.splice(idx, 1)
      
      // Remove user from all task assignments in this project
      tasks.forEach(task => {
        if (task.project_id === this.currentProjectId) {
          // Remove from assigned_to_list
          if (task.assigned_to_list && task.assigned_to_list.includes(userId)) {
            task.assigned_to_list = task.assigned_to_list.filter(id => id !== userId)
          }
          // Update assigned_to if it was this user
          if (task.assigned_to === userId) {
            task.assigned_to = task.assigned_to_list?.[0] || null
          }
        }
      })
      
      this.notify()
    }
  }

  // ============ SECTIONS ============
  getSections(projectId?: string): Section[] {
    const pid = projectId || this.currentProjectId
    if (!pid) return []
    return sections.filter(s => s.project_id === pid).sort((a, b) => a.order - b.order)
  }

  createSection(name: string, color: string, allowedRoles: string[]): Section {
    const existingSections = this.getSections()
    const section: Section = {
      id: generateId(),
      project_id: this.currentProjectId!,
      name,
      color,
      order: existingSections.length,
      allowed_roles: allowedRoles.length > 0 ? allowedRoles : ['Owner'],
      created_at: new Date().toISOString(),
    }
    sections.push(section)
    this.notify()
    return section
  }

  updateSectionRoles(sectionId: string, allowedRoles: string[]) {
    const idx = sections.findIndex(s => s.id === sectionId)
    if (idx !== -1) {
      sections[idx].allowed_roles = allowedRoles
      this.notify()
    }
  }

  updateSection(sectionId: string, updates: { name?: string; color?: string; allowed_roles?: string[] }) {
    const idx = sections.findIndex(s => s.id === sectionId)
    if (idx !== -1) {
      if (updates.name) sections[idx].name = updates.name
      if (updates.color) sections[idx].color = updates.color
      if (updates.allowed_roles) sections[idx].allowed_roles = updates.allowed_roles
      this.notify()
    }
  }

  deleteSection(sectionId: string) {
    const idx = sections.findIndex(s => s.id === sectionId)
    if (idx !== -1) {
      sections.splice(idx, 1)
      const taskIndices = tasks.map((t, i) => t.section_id === sectionId ? i : -1).filter(i => i !== -1).reverse()
      taskIndices.forEach(i => tasks.splice(i, 1))
      this.notify()
    }
  }

  // ============ TASKS ============
  getTasks(sectionId: string): (ExtendedTask & { assignees: (ExtendedUser & { role_titles: string[] })[] })[] {
    return tasks
      .filter(t => t.section_id === sectionId)
      .map(t => ({
        ...t,
        assignees: (t.assigned_to_list || []).map(userId => ({
          ...users.find(u => u.id === userId)!,
          role_titles: members.find(m => m.project_id === t.project_id && m.user_id === userId)?.role_titles || [],
        })).filter(a => a.id),
      }))
  }

  getTaskCommentCount(taskId: string): number {
    return taskComments.filter(c => c.task_id === taskId).length
  }

  createTask(sectionId: string, data: { title: string; description?: string; status: TaskStatus; priority: Priority; assigned_to_list?: string[]; deadline?: string | null }): ExtendedTask {
    const section = sections.find(s => s.id === sectionId)
    const task: ExtendedTask = {
      id: generateId(),
      project_id: section?.project_id || this.currentProjectId!,
      section_id: sectionId,
      title: data.title,
      description: data.description || null,
      status: data.status,
      priority: data.priority,
      due_date: null,
      deadline: data.deadline || null,
      assigned_to: data.assigned_to_list?.[0] || null,
      assigned_to_list: data.assigned_to_list || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    tasks.push(task)
    this.notify()
    return task
  }

  updateTask(taskId: string, updates: Partial<ExtendedTask>) {
    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx !== -1) {
      tasks[idx] = { ...tasks[idx], ...updates, updated_at: new Date().toISOString() }
      if (updates.assigned_to_list) {
        tasks[idx].assigned_to = updates.assigned_to_list[0] || null
      }
      this.notify()
    }
  }

  toggleTaskStatus(taskId: string): TaskStatus {
    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx !== -1) {
      const newStatus: TaskStatus = tasks[idx].status === 'ACTIVE' ? 'DONE' : 'ACTIVE'
      tasks[idx].status = newStatus
      tasks[idx].updated_at = new Date().toISOString()
      this.notify()
      return newStatus
    }
    return 'ACTIVE'
  }

  deleteTask(taskId: string) {
    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx !== -1) {
      tasks.splice(idx, 1)
      this.notify()
    }
  }

  // ============ TASK COMMENTS ============
  getTaskComments(taskId: string): TaskComment[] {
    return taskComments.filter(c => c.task_id === taskId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }

  addTaskComment(taskId: string, text: string): TaskComment {
    const user = this.getCurrentUser()
    const comment: TaskComment = {
      id: generateId(),
      task_id: taskId,
      user_id: currentUserId!,
      user_name: user?.full_name || 'Unknown',
      text,
      timestamp: new Date().toISOString(),
    }
    taskComments.push(comment)
    this.notify()
    return comment
  }
}

export const store = new Store()

// Auto-login for demo
store.login('berk@teamsync.io', 'demo')
