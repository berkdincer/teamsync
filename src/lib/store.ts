// TeamSync Store - Complete Project Management
import { supabase } from '@/lib/supabaseClient'
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
  working_on_by: string[] // User IDs of people currently working on this task
  working_on_started: string | null // Timestamp when work started
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
// Demo data
const users: ExtendedUser[] = []

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
// Project-specific roles
const projectRoles: ProjectRole[] = []

const projects: Project[] = []
const members: ProjectMember[] = []
const sections: Section[] = []
const tasks: ExtendedTask[] = []
const taskComments: TaskComment[] = []

// Role colors for new roles
const ROLE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6']

class Store {
  private listeners: Set<() => void> = new Set()
  private currentProjectId: string | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.sync()
    }
  }

  // ============ PERSISTENCE ============
  // Sync with Supabase
  async sync() {
    if (typeof window === 'undefined') return

    try {
      // 1. Load User
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        isAuthenticated = true
        currentUserId = user.id
      } else {
        isAuthenticated = false
        currentUserId = null
      }

      // 2. Load all data in parallel for performance
      const [
        { data: profiles },
        { data: dbProjects },
        { data: dbMembers },
        { data: dbSections },
        { data: dbRoles },
        { data: dbTasks },
        { data: dbComments } // Fetch comments too
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('project_members').select('*'),
        supabase.from('sections').select('*'),
        supabase.from('project_roles').select('*'),
        supabase.from('tasks').select('*'),
        supabase.from('task_comments').select('*')
      ])

      // 3. Update local state
      if (profiles) {
        users.length = 0
        users.push(...profiles.map(p => ({
          ...p,
          surname: '', // Add if needed
          username: p.username || p.email?.split('@')[0] || 'User',
          streak: 0,
          last_active: new Date().toISOString()
        } as ExtendedUser)))
      }

      if (dbProjects) {
        projects.length = 0
        projects.push(...dbProjects)
      }

      if (dbMembers) {
        members.length = 0
        members.push(...dbMembers)
      }

      if (dbSections) {
        sections.length = 0
        sections.push(...dbSections)
      }

      if (dbRoles) {
        projectRoles.length = 0
        projectRoles.push(...dbRoles)
      }

      if (dbTasks) {
        tasks.length = 0
        tasks.push(...dbTasks.map(t => ({
          ...t,
          working_on_by: t.working_on_by || [],
          working_on_started: t.working_on_started || null,
          assigned_to_list: t.assigned_to_list || []
        } as ExtendedTask)))
      }

      if (dbComments) {
        taskComments.length = 0
        taskComments.push(...dbComments.map(c => {
          const author = users.find(u => u.id === c.user_id)
          return {
            ...c,
            user_name: author ? author.full_name : (c.user_name || 'Unknown User'),
            timestamp: c.timestamp || new Date().toISOString()
          }
        }))
      }

      // Set current project
      if (currentUserId && projects.length > 0) {
        const myProjects = this.getMyProjects()
        if (myProjects.length > 0) {
          // Only set if not already set, or if current is invalid
          if (!this.currentProjectId || !myProjects.find(p => p.id === this.currentProjectId)) {
            this.currentProjectId = myProjects[0].id
          }
        }
      }

      this.notify()

      // Initialize Realtime Subscription
      this.initRealtime()
    } catch (e) {
      console.error('Failed to sync with Supabase', e)
    }
  }

  // ============ REALTIME ============
  private realtimeChannel: ReturnType<typeof supabase.channel> | null = null

  private initRealtime() {
    // Prevent duplicate subscriptions
    if (this.realtimeChannel) return

    this.realtimeChannel = supabase.channel('task-comments-realtime')

    this.realtimeChannel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_comments' }, (payload) => {
        const newComment = payload.new as TaskComment

        // Avoid duplicates (if we just created it locally)
        if (taskComments.some(c => c.id === newComment.id)) return

        const author = users.find(u => u.id === newComment.user_id)
        const commentWithUser: TaskComment = {
          ...newComment,
          user_name: author ? author.full_name : (newComment.user_name || 'Unknown User'),
          timestamp: newComment.timestamp || new Date().toISOString()
        }

        taskComments.push(commentWithUser)
        this.notify()
      })
      .subscribe()
  }

  private save() {
    // Deprecated for local storage, but keeping to avoid breaking notify
  }

  subscribe(callback: () => void) {
    this.listeners.add(callback)
    return () => { this.listeners.delete(callback) }
  }

  private notify() {
    this.save()
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

  async login(email: string, password: string): Promise<ExtendedUser | null> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error('Login failed', error)
      return null
    }

    if (data.user) {
      isAuthenticated = true
      currentUserId = data.user.id
      this.updateStreak(data.user.id)

      // Ensure user is in our local list, fetch if not
      if (!users.find(u => u.id === data.user!.id)) {
        await this.sync()
      }

      this.notify()
      return users.find(u => u.id === data.user!.id) || null
    }
    return null
  }

  async register(name: string, surname: string, username: string, email: string, password: string): Promise<ExtendedUser | null> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: `${name} ${surname}`,
          username,
        }
      }
    })

    if (error) {
      console.error('Registration failed', error)
      return null
    }

    if (data.user) {
      // Manual profile creation if trigger fails or just to be safe/optimistic
      const newUser: ExtendedUser = {
        id: data.user.id,
        email,
        full_name: `${name} ${surname}`,
        surname: surname || '', // Store specific
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
    return null
  }

  async logout() {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Logout failed', err)
    } finally {
      isAuthenticated = false
      currentUserId = null
      this.notify()
    }
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

    // Reset times to midnight for accurate day comparison
    lastActive.setHours(0, 0, 0, 0)
    now.setHours(0, 0, 0, 0)

    const diffDays = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      // Same day - no change
    } else if (diffDays === 1) {
      // Consecutive day - increment streak
      users[userIdx].streak += 1
    } else {
      // Missed days - reset streak to 0
      users[userIdx].streak = 0
    }

    users[userIdx].last_active = new Date().toISOString()
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

    // Supabase
    supabase.from('project_roles').insert(newRole).then(({ error }) => {
      if (error) console.error('Create role failed', error)
    })

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

      // Supabase
      supabase.from('project_roles').update({ permissions: projectRoles[idx].permissions }).eq('id', roleId).then(({ error }) => {
        if (error) console.error('Update role permissions failed', error)
      })
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

    // Supabase
    const cleanup = async () => {
      // Remove from sections allowed_roles (this is tough as it's an array modification, manual update needed)
      // For simplicity, we won't deep clean array columns in DB via simple command without stored procedure, 
      // but since we updated local state, next sync/load might be inconsistent. 
      // Better to update sections that had this role.
      const sectionsToUpdate = sections.filter(s => s.project_id === projectId)
      for (const s of sectionsToUpdate) {
        if (s.allowed_roles.includes(deletedRoleName)) {
          // Cleaned locally, just push update
          await supabase.from('sections').update({ allowed_roles: s.allowed_roles }).eq('id', s.id)
        }
      }

      // Update members
      // Same issue, deeply nested array.
      const membersToUpdate = members.filter(m => m.project_id === projectId)
      for (const m of membersToUpdate) {
        // We already updated local 'members', so we can push the new role_titles
        await supabase.from('project_members').update({ role_titles: m.role_titles }).match({ project_id: projectId, user_id: m.user_id })
      }

      await supabase.from('project_roles').delete().eq('id', roleId)
    }
    cleanup().catch(e => console.error('Delete role failed', e))
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

    const ownerRole: ProjectRole = { id: generateId(), project_id: projectId, name: 'Owner', color: '#f59e0b', permissions: ADMIN_PERMISSIONS, created_at: new Date().toISOString() }
    const memberRole: ProjectRole = { id: generateId(), project_id: projectId, name: 'Member', color: '#6b7280', permissions: DEFAULT_PERMISSIONS, created_at: new Date().toISOString() }

    projectRoles.push(ownerRole)
    projectRoles.push(memberRole)

    members.push({ project_id: project.id, user_id: currentUserId!, role_titles: ['Owner'], joined_at: new Date().toISOString() })
    this.currentProjectId = project.id
    this.notify()

    // Supabase - with detailed logging
    console.log('[Supabase] Creating project:', project)
    supabase.from('projects').insert(project).then(({ data, error }) => {
      if (error) {
        console.error('[Supabase] Create project failed:', error.message, error.details, error.hint, error)
      } else {
        console.log('[Supabase] Project created successfully:', data)
        // 2. Create Default Roles
        supabase.from('project_roles').insert([ownerRole, memberRole]).then(({ error: roleError }) => {
          if (roleError) console.error('[Supabase] Create roles failed:', roleError.message, roleError)
          else {
            // 3. Add Creator as Member
            supabase.from('project_members').insert({
              project_id: project.id,
              user_id: currentUserId!,
              role_titles: ['Owner'],
              joined_at: new Date().toISOString()
            }).then(({ error: memError }) => {
              if (memError) console.error('[Supabase] Add creator member failed:', memError.message, memError)
              else console.log('[Supabase] Member added successfully')
            })
          }
        })
      }
    })

    return project
  }

  joinProject(inviteCode: string): boolean {
    const project = projects.find(p => p.invite_code === inviteCode)
    if (!project || !currentUserId) return false
    const existing = members.find(m => m.project_id === project.id && m.user_id === currentUserId)
    if (existing) return true

    members.push({ project_id: project.id, user_id: currentUserId, role_titles: ['Member'], joined_at: new Date().toISOString() })
    this.notify()

    // Supabase
    supabase.from('project_members').insert({
      project_id: project.id,
      user_id: currentUserId,
      role_titles: ['Member'],
      joined_at: new Date().toISOString()
    }).then(({ error }) => {
      if (error) console.error('Join project failed', error)
    })

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

    // Supabase
    // Cascade delete is not set in my manual schema, so we should delete related items manually or trust the user to add cascade.
    // For now, let's delete the project and assume cascade or manual clean up.
    // Actually, explicit cleanup is safer given the schema I saw.
    const cleanup = async () => {
      await supabase.from('task_comments').delete().in('task_id', tasks.filter(t => t.project_id === projectId).map(t => t.id))
      await supabase.from('tasks').delete().eq('project_id', projectId)
      await supabase.from('sections').delete().eq('project_id', projectId)
      await supabase.from('project_members').delete().eq('project_id', projectId)
      await supabase.from('project_roles').delete().eq('project_id', projectId)
      await supabase.from('projects').delete().eq('id', projectId)
    }
    cleanup().catch(e => console.error('Delete project failed', e))

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

    // Supabase
    supabase.from('project_members').delete().match({ project_id: projectId, user_id: currentUserId }).then(({ error }) => {
      if (error) console.error('Leave project failed', error)
    })

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

    // Supabase
    supabase.from('project_members').update({ role_titles: members[idx].role_titles }).match({ project_id: this.currentProjectId, user_id: userId }).then(({ error }) => {
      if (error) console.error('Toggle member role failed', error)
    })
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

    // Supabase
    supabase.from('project_members').update({ role_titles: members[idx].role_titles }).match({ project_id: this.currentProjectId, user_id: userId }).then(({ error }) => {
      if (error) console.error('Set member roles failed', error)
    })
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

      // Supabase
      const cleanup = async () => {
        // Unassign tasks
        await supabase.from('tasks').update({ assigned_to: null }).eq('project_id', this.currentProjectId).eq('assigned_to', userId)

        // Remove from array columns (assigned_to_list, working_on_by) is hard. 
        // We'll skip complex array cleaning for now as it doesn't break app (just shows old assignee)
        // Ideally Use RPC or fetch-modify-save pattern for each task.

        // Remove member
        await supabase.from('project_members').delete().match({ project_id: this.currentProjectId, user_id: userId })
      }
      cleanup().catch(e => console.error('Remove member failed', e))
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

    // Supabase
    supabase.from('sections').insert(section).then(({ error }) => {
      if (error) console.error('Create section failed', error)
    })

    return section
  }

  updateSectionRoles(sectionId: string, allowedRoles: string[]) {
    const idx = sections.findIndex(s => s.id === sectionId)
    if (idx !== -1) {
      sections[idx].allowed_roles = allowedRoles
      this.notify()

      // Supabase
      supabase.from('sections').update({ allowed_roles: allowedRoles }).eq('id', sectionId).then(({ error }) => {
        if (error) console.error('Update section roles failed', error)
      })
    }
  }

  updateSection(sectionId: string, updates: { name?: string; color?: string; allowed_roles?: string[] }) {
    const idx = sections.findIndex(s => s.id === sectionId)
    if (idx !== -1) {
      if (updates.name) sections[idx].name = updates.name
      if (updates.color) sections[idx].color = updates.color
      if (updates.allowed_roles) sections[idx].allowed_roles = updates.allowed_roles
      this.notify()

      // Supabase
      const dbUpdates: any = {}
      if (updates.name) dbUpdates.name = updates.name
      if (updates.color) dbUpdates.color = updates.color
      if (updates.allowed_roles) dbUpdates.allowed_roles = updates.allowed_roles

      supabase.from('sections').update(dbUpdates).eq('id', sectionId).then(({ error }) => {
        if (error) console.error('Update section failed', error)
      })
    }
  }

  deleteSection(sectionId: string) {
    const idx = sections.findIndex(s => s.id === sectionId)
    if (idx !== -1) {
      sections.splice(idx, 1)
      const taskIndices = tasks.map((t, i) => t.section_id === sectionId ? i : -1).filter(i => i !== -1).reverse()
      taskIndices.forEach(i => tasks.splice(i, 1))
      this.notify()

      // Supabase
      const cleanup = async () => {
        await supabase.from('task_comments').delete().in('task_id', tasks.filter(t => t.section_id === sectionId).map(t => t.id))
        await supabase.from('tasks').delete().eq('section_id', sectionId)
        await supabase.from('sections').delete().eq('id', sectionId)
      }
      cleanup().catch(e => console.error('Delete section failed', e))
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

  getTask(taskId: string): ExtendedTask | undefined {
    return tasks.find(t => t.id === taskId)
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
      working_on_by: [],
      working_on_started: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    tasks.push(task)
    this.notify()

    // Supabase
    supabase.from('tasks').insert({
      id: task.id,
      project_id: task.project_id,
      section_id: task.section_id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      deadline: task.deadline,
      assigned_to: task.assigned_to,
      assigned_to_list: task.assigned_to_list,
      created_at: task.created_at
    }).then(({ error }) => {
      if (error) console.error('Create task failed', error)
    })

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

      // Supabase
      const { assignees, ...dbUpdates } = updates as any // Exclude UI-only properties if any
      if (dbUpdates.assigned_to_list) dbUpdates.assigned_to = dbUpdates.assigned_to_list[0] || null

      supabase.from('tasks').update(dbUpdates).eq('id', taskId).then(({ error }) => {
        if (error) console.error('Update task failed', error)
      })
    }
  }

  toggleTaskStatus(taskId: string): TaskStatus {
    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx !== -1) {
      const newStatus: TaskStatus = tasks[idx].status === 'ACTIVE' ? 'DONE' : 'ACTIVE'
      tasks[idx].status = newStatus
      tasks[idx].updated_at = new Date().toISOString()
      this.notify()

      // Supabase
      supabase.from('tasks').update({ status: newStatus }).eq('id', taskId).then(({ error }) => {
        if (error) console.error('Toggle task failed', error)
      })

      return newStatus
    }
    return 'ACTIVE'
  }

  deleteTask(taskId: string) {
    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx !== -1) {
      tasks.splice(idx, 1)
      this.notify()

      // Supabase
      supabase.from('tasks').delete().eq('id', taskId).then(({ error }) => {
        if (error) console.error('Delete task failed', error)
      })
    }
  }

  // ============ WORKING ON TASK ============
  // Check if current user can work on a task (must be assigned and have edit rights for the section)
  canWorkOnTask(taskId: string): boolean {
    if (!currentUserId) return false
    const task = tasks.find(t => t.id === taskId)
    if (!task) return false

    // Must be assigned to the task
    const isAssigned = task.assigned_to_list.includes(currentUserId)
    if (!isAssigned) return false

    // Must have permission to edit the section
    return this.canEditSection(task.section_id)
  }

  startWorkingOn(taskId: string): boolean {
    if (!currentUserId) return false
    if (!this.canWorkOnTask(taskId)) return false

    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx === -1) return false

    // Can't work on completed or failed tasks
    if (tasks[idx].status === 'DONE' || tasks[idx].status === 'FAILED') return false

    // Already working on this task
    if (tasks[idx].working_on_by.includes(currentUserId!)) return true

    // Multiple permitted users CAN work on the same task
    // User CAN work on multiple tasks at once (requested feature)

    // Add user to working list (multiple users allowed)
    tasks[idx].working_on_by = [...tasks[idx].working_on_by, currentUserId!]
    if (!tasks[idx].working_on_started) {
      tasks[idx].working_on_started = new Date().toISOString()
    }
    tasks[idx].updated_at = new Date().toISOString()
    this.notify()

    // Supabase
    supabase.from('tasks').update({
      working_on_by: tasks[idx].working_on_by,
      working_on_started: tasks[idx].working_on_started,
      updated_at: tasks[idx].updated_at
    }).eq('id', taskId).then(({ error }) => {
      if (error) console.error('Start working on failed', error)
    })

    return true
  }

  stopWorkingOn(taskId: string): boolean {
    if (!currentUserId) return false

    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx === -1) return false

    // Only remove if user is in the working list
    if (!tasks[idx].working_on_by.includes(currentUserId)) return false

    tasks[idx].working_on_by = tasks[idx].working_on_by.filter(id => id !== currentUserId)
    if (tasks[idx].working_on_by.length === 0) {
      tasks[idx].working_on_started = null
    }
    tasks[idx].updated_at = new Date().toISOString()
    this.notify()

    // Supabase
    supabase.from('tasks').update({
      working_on_by: tasks[idx].working_on_by,
      working_on_started: tasks[idx].working_on_started,
      updated_at: tasks[idx].updated_at
    }).eq('id', taskId).then(({ error }) => {
      if (error) console.error('Stop working on failed', error)
    })

    return true
  }

  // Get all users working on a task
  getWorkingOnUsers(taskId: string): ExtendedUser[] {
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.working_on_by.length === 0) return []
    return task.working_on_by.map(id => users.find(u => u.id === id)).filter(Boolean) as ExtendedUser[]
  }

  isCurrentUserWorkingOn(taskId: string): boolean {
    if (!currentUserId) return false
    const task = tasks.find(t => t.id === taskId)
    return task?.working_on_by.includes(currentUserId) || false
  }

  // Get the tasks a user is currently working on
  getUserWorkingOnTasks(userId: string): { task: ExtendedTask; sectionName: string; projectName: string }[] {
    const projId = this.currentProjectId
    if (!projId) return []
    const projectTasks = tasks.filter(t => t.project_id === projId && t.working_on_by.includes(userId) && t.status !== 'DONE')

    return projectTasks.map(task => {
      const section = sections.find(s => s.id === task.section_id)
      const project = projects.find(p => p.id === task.project_id)
      return { task, sectionName: section?.name || '', projectName: project?.name || '' }
    })
  }

  // Deprecated single version (kept for compatibility if needed, but redirects to array 0)
  getUserWorkingOnTask(userId: string) {
    const tasks = this.getUserWorkingOnTasks(userId)
    return tasks.length > 0 ? tasks[0] : null
  }

  // Get overdue tasks (deadline passed but not completed)
  getOverdueTasks(): (ExtendedTask & { assignees: (ExtendedUser & { role_titles: string[] })[] })[] {
    const projId = this.currentProjectId
    if (!projId) return []
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    return tasks
      .filter(t =>
        t.project_id === projId &&
        t.status !== 'DONE' &&
        t.deadline &&
        new Date(t.deadline) < now
      )
      .map(t => {
        const membersList = this.getProjectMembers()
        const assignees = t.assigned_to_list
          .map(userId => {
            const m = membersList.find(mem => mem.user_id === userId)
            return m ? { ...m.user, role_titles: m.role_titles } : null
          })
          .filter(Boolean) as (ExtendedUser & { role_titles: string[] })[]
        return { ...t, assignees }
      })
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

    // Supabase
    supabase.from('task_comments').insert({
      id: comment.id,
      task_id: comment.task_id,
      user_id: comment.user_id,
      user_name: comment.user_name,
      text: comment.text,
      timestamp: comment.timestamp
    }).then(({ error }) => {
      if (error) console.error('Add comment failed', error)
    })

    return comment
  }

  // ============ AUTO-FAIL EXPIRED TASKS ============
  checkAndFailExpiredTasks(): number {
    const projId = this.currentProjectId
    if (!projId) return 0

    const now = new Date()
    now.setHours(23, 59, 59, 999) // End of today

    let failedCount = 0
    const tasksToUpdate: string[] = []

    tasks.forEach((t, i) => {
      if (
        t.project_id === projId &&
        t.status === 'ACTIVE' &&
        t.deadline &&
        new Date(t.deadline) < now
      ) {
        tasks[i].status = 'FAILED'
        tasks[i].working_on_by = [] // Clear working users
        tasks[i].working_on_started = null
        tasks[i].updated_at = new Date().toISOString()
        failedCount++
        tasksToUpdate.push(t.id)
      }
    })

    if (failedCount > 0) {
      this.notify()

      // Supabase
      Promise.all(tasksToUpdate.map(id =>
        supabase.from('tasks').update({
          status: 'FAILED',
          working_on_by: [],
          working_on_started: null
        }).eq('id', id)
      )).then(results => {
        const errors = results.filter(r => r.error)
        if (errors.length > 0) console.error('Failed to update expired tasks', errors)
      })
    }
    return failedCount
  }

  // Get failed tasks for current project
  getFailedTasks(): ExtendedTask[] {
    const projId = this.currentProjectId
    if (!projId) return []
    return tasks.filter(t => t.project_id === projId && t.status === 'FAILED')
  }
}

export const store = new Store()

// Initialize demo data if empty
// Disabled for Supabase integration - data will be synced from DB
// if (typeof window !== 'undefined' && (!store.getUsers() || store.getUsers().length === 0)) {
// ...
// }
