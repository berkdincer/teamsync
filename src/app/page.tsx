'use client'
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useCallback, useRef } from 'react'
import { store, Section, ExtendedTask, ExtendedUser, DEFAULT_ROLE_TEMPLATES, TaskComment, ProjectRole, RolePermissions, DEFAULT_PERMISSIONS } from '@/lib/store'
import type { Project, Priority, TaskStatus, ProjectMember } from '@/types/database'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from '@/components/Toast'
import confetti from 'canvas-confetti'

// ============ PREMIUM DESIGN TOKENS ============
const theme = {
  // Layered backgrounds (dark to light)
  bg: {
    base: '#080c14',      // Deepest background
    panel: '#0c1220',     // Sidebar, panels
    surface: '#111827',   // Cards, elevated surfaces
    hover: '#1a2435',     // Hover states
    active: '#1e3a5f',    // Active/selected states
  },
  // Text hierarchy
  text: {
    primary: '#f1f5f9',   // High emphasis
    secondary: '#94a3b8', // Medium emphasis
    muted: '#64748b',     // Low emphasis
    faint: '#475569',     // Disabled/hints
  },
  // Single accent color
  accent: {
    primary: '#6366f1',   // Indigo
    hover: '#818cf8',
    muted: 'rgba(99, 102, 241, 0.12)',
    glow: 'rgba(99, 102, 241, 0.08)',
  },
  // Semantic colors
  status: {
    high: { text: '#f87171', bg: 'rgba(248, 113, 113, 0.12)' },
    medium: { text: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)' },
    low: { text: '#34d399', bg: 'rgba(52, 211, 153, 0.12)' },
    done: { text: '#64748b', bg: 'rgba(100, 116, 139, 0.08)' },
  },
  // Borders (use sparingly)
  border: {
    subtle: 'rgba(148, 163, 184, 0.06)',
    default: 'rgba(148, 163, 184, 0.1)',
    hover: 'rgba(148, 163, 184, 0.15)',
  },
  // Shadows (premium depth)
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.4)',
    md: '0 4px 12px rgba(0,0,0,0.3)',
    lg: '0 8px 24px rgba(0,0,0,0.35)',
    card: '0 2px 8px rgba(0,0,0,0.2)',
    cardHover: '0 8px 24px rgba(0,0,0,0.4)',
  },
  // Spacing rhythm
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },
  // Radius
  radius: { sm: 8, md: 12, lg: 16, xl: 20 },
}

// ============ AVATAR ============
function Avatar({ name, size = 28, showOnline }: { name: string; size?: number; showOnline?: boolean }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: size,
        background: `linear-gradient(135deg, hsl(${hue}, 60%, 45%), hsl(${hue + 30}, 60%, 35%))`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontWeight: 600, fontSize: size * 0.38, letterSpacing: '-0.02em'
      }}>
        {initials}
      </div>
      {showOnline && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: 8, backgroundColor: '#22c55e', border: `2px solid ${theme.bg.panel}` }} />}
    </div>
  )
}

function AvatarGroup({ users, max = 3 }: { users: { full_name: string }[]; max?: number }) {
  const visible = users.slice(0, max)
  const extra = users.length - max
  return (
    <div style={{ display: 'flex' }}>
      {visible.map((u, i) => (
        <div key={i} style={{ marginLeft: i > 0 ? -6 : 0, borderRadius: 20, border: `2px solid ${theme.bg.surface}` }}>
          <Avatar name={u.full_name} size={22} />
        </div>
      ))}
      {extra > 0 && (
        <div style={{ marginLeft: -6, width: 22, height: 22, borderRadius: 22, backgroundColor: theme.bg.hover, border: `2px solid ${theme.bg.surface}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: theme.text.muted }}>
          +{extra}
        </div>
      )}
    </div>
  )
}

// ============ ICONS (Minimal) ============
const Icon = {
  search: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" /></svg>,
  plus: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>,
  check: <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>,
  calendar: <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  message: <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  lock: <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  folder: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>,
  users: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  link: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  logout: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
  more: <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /><circle cx="5" cy="12" r="1.5" /></svg>,
  close: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>,
  send: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4 20-7z" /><path d="m22 2-11 11" /></svg>,
  trash: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  settings: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 1v4m0 14v4m-9-9h4m14 0h-4M4.22 4.22l2.83 2.83m9.9 9.9 2.83 2.83m0-15.56-2.83 2.83m-9.9 9.9-2.83 2.83" /></svg>,
}

// ============ PRIORITY PILL ============
function PriorityPill({ priority }: { priority: Priority }) {
  const config = { HIGH: theme.status.high, MEDIUM: theme.status.medium, LOW: theme.status.low }[priority]
  const label = { HIGH: 'High', MEDIUM: 'Med', LOW: 'Low' }[priority]
  return (
    <span style={{ fontSize: 10, fontWeight: 500, padding: '3px 7px', borderRadius: 6, backgroundColor: config.bg, color: config.text }}>
      {label}
    </span>
  )
}

// ============ PROFILE CARD (Unified) ============
function ProfileCard({ member, onClose, style }: { member: { user_id: string; user: ExtendedUser; role_titles: string[]; joined_at: string }; onClose: () => void; style?: React.CSSProperties }) {
  const isOnline = store.isUserOnline(member.user_id)
  const activeTasks = store.getUserWorkingOnTasks(member.user_id)

  const formatLastActive = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ backgroundColor: theme.bg.panel, borderRadius: theme.radius.lg, overflow: 'hidden', minWidth: 300, maxWidth: 340, ...style }}>
      {/* Gradient Header */}
      <div style={{
        height: 60,
        background: `linear-gradient(135deg, ${theme.accent.primary}40 0%, #1e3a5f 60%, ${theme.bg.surface} 100%)`,
      }} />

      {/* Content */}
      <div style={{ padding: '0 20px 20px', marginTop: -30 }}>
        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', border: `3px solid ${theme.bg.panel}`, overflow: 'hidden' }}>
            <Avatar name={`${member.user.full_name} ${member.user.surname}`} size={54} />
          </div>
        </div>

        {/* Name & Status */}
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 3 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: theme.text.primary }}>
              {member.user.full_name} {member.user.surname}
            </h3>
            <span style={{ fontSize: 11, color: '#f59e0b' }}>🔥 {member.user.streak}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: theme.text.muted }}>@{member.user.username}</span>
            {isOnline ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.15)', padding: '2px 5px', borderRadius: 6 }}>
                <span style={{ width: 4, height: 4, borderRadius: 4, backgroundColor: '#22c55e' }} /> Online
              </span>
            ) : (
              <span style={{ fontSize: 9, color: theme.text.faint }}>{formatLastActive(member.user.last_active)}</span>
            )}
          </div>
        </div>

        {/* Roles */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12, justifyContent: 'center' }}>
          {member.role_titles.map(role => (
            <span key={role} style={{ fontSize: 9, fontWeight: 500, color: theme.accent.primary, backgroundColor: theme.accent.muted, padding: '3px 8px', borderRadius: 10 }}>{role}</span>
          ))}
        </div>

        {/* Info Section */}
        <div style={{ fontSize: 11, marginBottom: 12, padding: '10px 12px', backgroundColor: theme.bg.surface, borderRadius: theme.radius.sm }}>
          <div style={{ display: 'flex', marginBottom: 6 }}>
            <span style={{ color: theme.text.muted, width: 50 }}>Email:</span>
            <span style={{ color: theme.text.primary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.user.email}</span>
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ color: theme.text.muted, width: 50 }}>Joined:</span>
            <span style={{ color: theme.text.primary }}>{new Date(member.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Active Tasks */}
        {activeTasks.length > 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 10px', marginBottom: 12,
            backgroundColor: theme.accent.muted, borderRadius: theme.radius.sm, border: `1px solid ${theme.accent.primary}30`
          }}>
            <div style={{ fontSize: 10, color: theme.text.muted, marginBottom: 2 }}>Working on:</div>
            {activeTasks.map((at, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: theme.accent.primary, boxShadow: `0 0 4px ${theme.accent.primary}`, flexShrink: 0 }} />
                <div style={{ fontSize: 10, lineHeight: 1.3, overflow: 'hidden' }}>
                  <span style={{ color: theme.text.primary, fontWeight: 500 }}>{at.task.title}</span>
                  <span style={{ color: theme.text.faint }}> | </span>
                  <span style={{ color: theme.accent.hover }}>{at.projectName}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Close Button */}
        <button onClick={onClose} style={{
          width: '100%', padding: '8px', backgroundColor: theme.bg.surface,
          border: `1px solid ${theme.border.default}`, borderRadius: theme.radius.sm,
          color: theme.text.primary, cursor: 'pointer', fontSize: 11, fontWeight: 500,
        }}>
          Close
        </button>
      </div>
    </div>
  )
}

// ============ MAIN APP ============
export default function App() {
  const [isAuth, setIsAuth] = useState(false)
  const [showLogin, setShowLogin] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      await store.sync()
      setIsAuth(store.isAuthenticated())
      setLoading(false)
    }
    init()

    return store.subscribe(() => {
      setIsAuth(store.isAuthenticated())
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#080c14', color: '#64748b' }}>Loading...</div>
  if (!isAuth) return showLogin ? <LoginPage onSwitch={() => setShowLogin(false)} /> : <RegisterPage onSwitch={() => setShowLogin(true)} />
  return <Dashboard />
}

// ============ AUTH PAGES ============
function LoginPage({ onSwitch }: { onSwitch: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.bg.base, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ width: 420, padding: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <img src="/teamsync.png" alt="TeamSync" style={{ height: 40, width: 'auto' }} />
          <span style={{ fontSize: 18, fontWeight: 600, color: theme.text.primary, letterSpacing: '-0.02em' }}>TeamSync</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: theme.text.primary, marginBottom: 8, letterSpacing: '-0.03em' }}>Welcome back</h1>
        <p style={{ color: theme.text.muted, marginBottom: 32, fontSize: 14 }}>Sign in to your workspace</p>
        {error && <div style={{ backgroundColor: theme.status.high.bg, borderRadius: theme.radius.sm, padding: '10px 14px', marginBottom: 20, color: theme.status.high.text, fontSize: 13 }}>{error}</div>}
        <form onSubmit={async e => {
          e.preventDefault()
          setError('')
          const user = await store.login(email, password)
          if (!user) setError('Invalid email or password')
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: theme.text.secondary, marginBottom: 8 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" style={inputStyle} required />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: theme.text.secondary, marginBottom: 8 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} required />
          </div>
          <button type="submit" style={btnPrimary}>Sign in</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 32, color: theme.text.muted, fontSize: 13 }}>
          Don&apos;t have an account? <button onClick={onSwitch} style={{ background: 'none', border: 'none', color: theme.accent.primary, cursor: 'pointer', fontWeight: 500 }}>Create one</button>
        </p>
      </div>
    </div>
  )
}

function RegisterPage({ onSwitch }: { onSwitch: () => void }) {
  const [form, setForm] = useState({ name: '', surname: '', username: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const lastSubmitRef = useRef<number>(0)
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent rapid submissions (2 second cooldown)
    const now = Date.now()
    if (now - lastSubmitRef.current < 2000) {
      setError('Please wait a moment before trying again')
      return
    }
    lastSubmitRef.current = now

    // Client-side validation
    if (form.password.length < 6) {
      setError('Password should be at least 6 characters')
      return
    }

    setLoading(true)
    setError('')

    const result = await store.register(form.name, form.surname, form.username, form.email, form.password)

    if (!result) {
      setError('Registration failed. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.bg.base, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ width: 420, padding: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <img src="/teamsync.png" alt="TeamSync" style={{ height: 40, width: 'auto' }} />
          <span style={{ fontSize: 18, fontWeight: 600, color: theme.text.primary, letterSpacing: '-0.02em' }}>TeamSync</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: theme.text.primary, marginBottom: 8, letterSpacing: '-0.03em' }}>Create account</h1>
        <p style={{ color: theme.text.muted, marginBottom: 32, fontSize: 14 }}>Start managing your team</p>
        {error && <div style={{ backgroundColor: theme.status.high.bg, borderRadius: theme.radius.sm, padding: '10px 14px', marginBottom: 20, color: theme.status.high.text, fontSize: 13 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <input type="text" value={form.name} onChange={e => update('name', e.target.value)} placeholder="First name" style={inputStyle} required disabled={loading} />
            <input type="text" value={form.surname} onChange={e => update('surname', e.target.value)} placeholder="Last name" style={inputStyle} required disabled={loading} />
          </div>
          <input type="text" value={form.username} onChange={e => update('username', e.target.value)} placeholder="Username" style={{ ...inputStyle, marginBottom: 16 }} required disabled={loading} />
          <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="Email" style={{ ...inputStyle, marginBottom: 16 }} required disabled={loading} />
          <input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Password (min 6 characters)" style={{ ...inputStyle, marginBottom: 24 }} required disabled={loading} />
          <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 32, color: theme.text.muted, fontSize: 13 }}>
          Already have an account? <button onClick={onSwitch} style={{ background: 'none', border: 'none', color: theme.accent.primary, cursor: 'pointer', fontWeight: 500 }}>Sign in</button>
        </p>
      </div>
    </div>
  )
}

// ============ DASHBOARD ============
function Dashboard() {
  const { showToast } = useToast()
  const [currentUser, setCurrentUser] = useState<ExtendedUser | null>(null)
  const [projects, setProjects] = useState<(Project & { role: string; isOwner: boolean })[]>([])
  const [currentProject, setCurrentProject] = useState<(Project & { role: string; isOwner: boolean }) | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [members, setMembers] = useState<(ProjectMember & { user: ExtendedUser })[]>([])
  const [modals, setModals] = useState({ newProject: false, newSection: false, members: false, join: false, task: null as ExtendedTask | null, addTask: null as string | null, editSection: null as Section | null, search: false, memberProfile: null as string | null })
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)
  const [copied, setCopied] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const refreshAll = useCallback(() => {
    setCurrentUser(store.getCurrentUser())
    setProjects(store.getMyProjects())
    setCurrentProject(store.getCurrentProject())
    setSections(store.getSections())
    setMembers(store.getProjectMembers())
    setRefresh(r => r + 1)
  }, [])

  // Auth state listener - restore session on page load
  useEffect(() => {
    let mounted = true

    // Initial sync on mount
    const initAuth = async () => {
      await store.sync()
      if (mounted) {
        refreshAll()
        setIsLoading(false)
      }
    }
    initAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] State changed:', event, session?.user?.email)
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await store.sync()
        if (mounted) refreshAll()
      } else if (event === 'SIGNED_OUT') {
        if (mounted) refreshAll()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [refreshAll])

  useEffect(() => { refreshAll(); return store.subscribe(refreshAll) }, [refreshAll])

  // Keyboard shortcut for search (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openModal('search')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const copyInvite = async () => {
    const code = store.getInviteCode()
    if (code) { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  const openModal = (key: keyof typeof modals, value: any = true) => setModals(m => ({ ...m, [key]: value }))
  const closeModal = (key: keyof typeof modals) => setModals(m => ({ ...m, [key]: key === 'task' || key === 'addTask' || key === 'editSection' || key === 'memberProfile' ? null : false }))

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: theme.bg.base, color: theme.text.primary, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", fontSize: 14 }}>
      {/* ========== SIDEBAR ========== */}
      <aside style={{ width: 240, backgroundColor: theme.bg.panel, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${theme.border.subtle}` }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/teamsync.png" alt="TeamSync" style={{ height: 40, width: 'auto' }} />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'white' }}>TeamSync</span>
        </div>

        {/* Profile Card */}
        {currentUser && (
          <div style={{ margin: '0 12px 16px', padding: '12px', backgroundColor: theme.bg.surface, borderRadius: theme.radius.md }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={`${currentUser.full_name} ${currentUser.surname}`} size={36} showOnline />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 13, color: theme.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.full_name}</div>
                <div style={{ fontSize: 11, color: theme.text.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: '#f59e0b' }}>🔥</span> {currentUser.streak} day streak
                </div>
              </div>
              <button onClick={() => store.logout()} style={{ background: 'none', border: 'none', color: theme.text.faint, cursor: 'pointer', padding: 4 }}>{Icon.logout}</button>
            </div>
          </div>
        )}

        {/* Projects */}
        <div style={{ flex: 1, padding: '0 12px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: theme.text.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projects</span>
            <button onClick={() => openModal('newProject')} style={{ background: 'none', border: 'none', color: theme.text.faint, cursor: 'pointer', padding: 2 }}>{Icon.plus}</button>
          </div>
          {projects.map(p => (
            <ProjectItem
              key={p.id}
              project={p}
              isActive={currentProject?.id === p.id}
              onSelect={() => store.setCurrentProject(p.id)}
              onDelete={() => setConfirmDialog({
                title: 'Delete Project',
                message: `Are you sure you want to delete "${p.name}"? This will permanently delete all sections, tasks, and remove all members. This action cannot be undone.`,
                onConfirm: () => store.deleteProject(p.id)
              })}
              onLeave={() => setConfirmDialog({
                title: 'Leave Project',
                message: `Are you sure you want to leave "${p.name}"? You will be removed from this project and unassigned from all tasks.`,
                onConfirm: () => store.leaveProject(p.id)
              })}
            />
          ))}
        </div>

        {/* Join */}
        <div style={{ padding: 12, borderTop: `1px solid ${theme.border.subtle}` }}>
          <button onClick={() => openModal('join')} style={{ width: '100%', padding: '10px 12px', backgroundColor: theme.bg.surface, border: 'none', borderRadius: theme.radius.sm, color: theme.text.muted, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {Icon.link} <span>Join with code</span>
          </button>
        </div>
      </aside>

      {/* ========== MAIN ========== */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {currentProject ? (
          <>
            {/* Header */}
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: `1px solid ${theme.border.subtle}`, backgroundColor: theme.bg.panel }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1 style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>{currentProject.name}</h1>
                <span style={{ fontSize: 11, fontWeight: 500, color: theme.accent.primary, backgroundColor: theme.accent.muted, padding: '4px 10px', borderRadius: 20 }}>{currentProject.role}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Search */}
                <button onClick={() => openModal('search')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', backgroundColor: theme.bg.surface, borderRadius: theme.radius.sm, color: theme.text.faint, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                  {Icon.search} <span>Search</span> <span style={{ marginLeft: 12, fontSize: 11, opacity: 0.5 }}>⌘K</span>
                </button>
                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {store.canCurrentUserInvite() && (
                    <button onClick={copyInvite} style={btnSecondary}>{Icon.link} {copied ? 'Copied!' : 'Invite'}</button>
                  )}
                  <button onClick={() => openModal('members')} style={btnSecondary}>{Icon.users} {members.length}</button>
                  {store.canCurrentUserAddSection() && <button onClick={() => openModal('newSection')} style={btnPrimarySmall}>{Icon.plus} Section</button>}
                </div>
              </div>
            </header>

            {/* Board */}
            <div style={{ flex: 1, display: 'flex', gap: 20, padding: 24, overflowX: 'auto' }}>
              {sections.length === 0 ? (
                <EmptyBoard canAdd={store.canCurrentUserAddSection()} onCreate={() => openModal('newSection')} />
              ) : (
                sections.map(section => (
                  <Column key={section.id} section={section} isOwner={currentProject.isOwner} onTaskClick={t => openModal('task', t)} onAddTask={() => openModal('addTask', section.id)} onEditSection={() => openModal('editSection', section)} refresh={refresh} showConfirm={setConfirmDialog} onMemberClick={userId => openModal('memberProfile', userId)} />
                ))
              )}
            </div>
          </>
        ) : (
          <EmptyProject onCreate={() => openModal('newProject')} onJoin={() => openModal('join')} />
        )}
      </main>

      {/* ========== MODALS ========== */}
      {modals.newProject && <NewProjectModal onClose={() => closeModal('newProject')} showToast={showToast} />}
      {modals.newSection && <NewSectionModal onClose={() => closeModal('newSection')} showToast={showToast} />}
      {modals.members && <MembersModal members={members} isOwner={currentProject?.isOwner || false} onClose={() => closeModal('members')} showConfirm={setConfirmDialog} />}
      {modals.join && <JoinModal onClose={() => closeModal('join')} showToast={showToast} />}
      {modals.task && <TaskDetailModal task={modals.task} onClose={() => closeModal('task')} showConfirm={setConfirmDialog} />}
      {modals.addTask && <AddTaskModal sectionId={modals.addTask} onClose={() => closeModal('addTask')} showToast={showToast} />}
      {modals.editSection && <EditSectionModal section={modals.editSection} onClose={() => closeModal('editSection')} />}
      {modals.search && <SearchModal onClose={() => closeModal('search')} onSelectTask={t => { closeModal('search'); openModal('task', t) }} />}
      {modals.memberProfile && <MemberProfileModal userId={modals.memberProfile} onClose={() => closeModal('memberProfile')} />}
      {confirmDialog && <ConfirmDialog title={confirmDialog.title} message={confirmDialog.message} onConfirm={() => { confirmDialog.onConfirm(); setConfirmDialog(null) }} onCancel={() => setConfirmDialog(null)} />}
    </div>
  )
}

// ============ PROJECT ITEM ============
function ProjectItem({ project, isActive, onSelect, onDelete, onLeave }: { project: Project & { role: string; isOwner: boolean }; isActive: boolean; onSelect: () => void; onDelete: () => void; onLeave: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{ position: 'relative', marginBottom: 2 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button onClick={onSelect} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: theme.radius.sm, border: 'none', cursor: 'pointer', textAlign: 'left', backgroundColor: isActive ? theme.accent.muted : hovered ? theme.bg.hover : 'transparent', color: isActive ? theme.text.primary : theme.text.secondary, transition: 'all 0.15s' }}>
        <span style={{ opacity: 0.7 }}>{Icon.folder}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
        {project.isOwner ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, opacity: 0.6 }}>👑</span>
            {hovered && (
              <span
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                style={{ color: theme.status.high.text, cursor: 'pointer', fontSize: 11, opacity: 0.8 }}
                title="Delete project"
              >
                {Icon.trash}
              </span>
            )}
          </span>
        ) : (
          hovered && (
            <span
              onClick={(e) => { e.stopPropagation(); onLeave() }}
              style={{ color: theme.text.faint, cursor: 'pointer', fontSize: 10, opacity: 0.8 }}
              title="Leave project"
            >
              ↩
            </span>
          )
        )}
      </button>
    </div>
  )
}

// ============ EMPTY STATES ============
function EmptyBoard({ canAdd, onCreate }: { canAdd: boolean; onCreate: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: theme.bg.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, color: theme.text.faint }}>{Icon.folder}</div>
      <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6, color: theme.text.primary }}>No sections yet</h3>
      <p style={{ fontSize: 13, color: theme.text.muted, marginBottom: 20 }}>{canAdd ? 'Create your first section to organize tasks' : 'Waiting for sections to be created'}</p>
      {canAdd && <button onClick={onCreate} style={btnPrimarySmall}>{Icon.plus} Create section</button>}
    </div>
  )
}

function EmptyProject({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: theme.bg.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, color: theme.text.faint }}>{Icon.folder}</div>
      <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6, color: theme.text.primary }}>Select a project</h3>
      <p style={{ fontSize: 13, color: theme.text.muted, marginBottom: 20 }}>Create a new project or join an existing one</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCreate} style={btnPrimarySmall}>{Icon.plus} Create</button>
        <button onClick={onJoin} style={btnSecondary}>{Icon.link} Join</button>
      </div>
    </div>
  )
}

// ============ COLUMN ============
function Column({ section, isOwner, onTaskClick, onAddTask, onEditSection, refresh, showConfirm, onMemberClick }: { section: Section; isOwner: boolean; onTaskClick: (t: ExtendedTask) => void; onAddTask: () => void; onEditSection: () => void; refresh: number; showConfirm: (dialog: { title: string; message: string; onConfirm: () => void } | null) => void; onMemberClick: (userId: string) => void }) {
  const tasks = store.getTasks(section.id)
  const canEdit = store.canEditSection(section.id)

  const toggleTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canEdit) return
    const status = store.toggleTaskStatus(id)
    if (status === 'DONE') confetti({ particleCount: 50, spread: 40, origin: { y: 0.7 }, colors: ['#6366f1', '#22c55e', '#f59e0b'] })
  }

  const active = tasks.filter(t => t.status === 'ACTIVE')
  const failed = tasks.filter(t => t.status === 'FAILED')
  const done = tasks.filter(t => t.status === 'DONE')
  const allowedRoles = store.getSectionAllowedRolesText(section.id)

  return (
    <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', backgroundColor: theme.bg.panel, borderRadius: theme.radius.lg, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: 4, backgroundColor: section.color }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{section.name}</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: theme.text.faint, backgroundColor: theme.bg.surface, padding: '2px 8px', borderRadius: 10 }}>{active.length}</span>
        </div>
        {isOwner && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={onEditSection} style={{ background: 'none', border: 'none', color: theme.text.faint, cursor: 'pointer', padding: 4, opacity: 0.6 }}>{Icon.settings}</button>
            <button onClick={() => showConfirm({ title: 'Delete Section', message: `Are you sure you want to delete "${section.name}"? All tasks in this section will also be deleted.`, onConfirm: () => store.deleteSection(section.id) })} style={{ background: 'none', border: 'none', color: theme.text.faint, cursor: 'pointer', padding: 4, opacity: 0.6 }}>{Icon.trash}</button>
          </div>
        )}
      </div>

      {/* Locked indicator */}
      {!canEdit && (
        <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center', gap: 8, color: theme.text.faint, fontSize: 11 }}>
          {Icon.lock} <span>Only {allowedRoles} can edit</span>
        </div>
      )}

      {/* Add task */}
      {canEdit && (
        <div style={{ padding: '0 12px 12px' }}>
          <button onClick={onAddTask} style={{ width: '100%', padding: '10px 12px', backgroundColor: 'transparent', border: `1px dashed ${theme.border.default}`, borderRadius: theme.radius.sm, color: theme.text.faint, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {Icon.plus} Add task
          </button>
        </div>
      )}

      {/* Tasks */}
      <div style={{ flex: 1, padding: '0 12px 12px', overflowY: 'auto' }}>
        {active.length === 0 && failed.length === 0 && done.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: theme.text.faint, fontSize: 12 }}>No tasks yet</div>
        )}
        {active.map(task => <TaskCard key={task.id} task={task} onToggle={toggleTask} onClick={() => onTaskClick(task)} canEdit={canEdit} showConfirm={showConfirm} onMemberClick={onMemberClick} />)}

        {/* Failed Section - Red Header */}
        {failed.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 600, color: theme.status.high.text, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '16px 4px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: theme.status.high.text }} />
              Failed · {failed.length}
            </div>
            {failed.map(task => <TaskCard key={task.id} task={task} isFailed onToggle={toggleTask} onClick={() => onTaskClick(task)} canEdit={canEdit} showConfirm={showConfirm} onMemberClick={onMemberClick} />)}
          </>
        )}

        {/* Completed Section */}
        {done.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 600, color: theme.status.low.text, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '16px 4px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: theme.status.low.text }} />
              Completed · {done.length}
            </div>
            {done.map(task => <TaskCard key={task.id} task={task} isDone onToggle={toggleTask} onClick={() => onTaskClick(task)} canEdit={canEdit} showConfirm={showConfirm} onMemberClick={onMemberClick} />)}
          </>
        )}
      </div>
    </div>
  )
}

// ============ TASK CARD (Premium) ============
function TaskCard({ task, isDone, isFailed, onToggle, onClick, canEdit, showConfirm, onMemberClick }: { task: ExtendedTask & { assignees: (ExtendedUser & { role_titles: string[] })[] }; isDone?: boolean; isFailed?: boolean; onToggle: (id: string, e: React.MouseEvent) => void; onClick: () => void; canEdit: boolean; showConfirm: (dialog: { title: string; message: string; onConfirm: () => void } | null) => void; onMemberClick?: (userId: string) => void }) {
  const [hovered, setHovered] = useState(false)
  const comments = store.getTaskCommentCount(task.id)
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !isDone
  const canDelete = store.canCurrentUserDelete()
  const workingOnUsers = store.getWorkingOnUsers(task.id)
  const workingOnUser = workingOnUsers.length > 0 ? workingOnUsers[0] : null
  const isCurrentUserWorking = store.isCurrentUserWorkingOn(task.id)
  const canWorkOn = store.canWorkOnTask(task.id)

  const formatDate = (d: string) => {
    const date = new Date(d)
    const diff = Math.ceil((date.getTime() - Date.now()) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    if (diff < 7 && diff > 0) return `${diff}d`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const handleWorkingToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCurrentUserWorking) {
      store.stopWorkingOn(task.id)
    } else {
      store.startWorkingOn(task.id)
    }
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        padding: 14,
        marginBottom: 8,
        backgroundColor: hovered ? theme.bg.hover : theme.bg.surface,
        borderRadius: theme.radius.md,
        cursor: 'pointer',
        transition: 'background 0.2s ease, box-shadow 0.2s ease',
        boxShadow: hovered ? theme.shadow.cardHover : theme.shadow.card,
        opacity: isDone ? 0.6 : 1,
        border: workingOnUsers.length > 0 ? `1px solid ${theme.accent.primary}` : '1px solid transparent',
      }}
    >
      {/* X Delete Button - Top Right (Now clear of overlap) */}
      {hovered && canDelete && (
        <button
          onClick={e => { e.stopPropagation(); showConfirm({ title: 'Delete Task', message: `Are you sure you want to delete "${task.title}"?`, onConfirm: () => store.deleteTask(task.id) }) }}
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 20, height: 20, borderRadius: 4,
            backgroundColor: 'transparent', border: 'none',
            color: '#ef4444',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
            opacity: 0.7,
            zIndex: 10,
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.7' }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      )}
      {/* Working On Indicator - Moved to bottom (hidden for failed) */}
      {workingOnUsers.length > 0 && !isDone && !isFailed && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          marginBottom: 10,
          backgroundColor: theme.accent.muted,
          borderRadius: theme.radius.sm,
          flexWrap: 'wrap',
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: theme.accent.primary,
            animation: 'pulse 1.5s infinite',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 11, color: theme.accent.hover, fontWeight: 500 }}>
            Active · {workingOnUsers.map(u => u.full_name).join(', ')}
          </span>
          {isCurrentUserWorking && (
            <button
              onClick={handleWorkingToggle}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: theme.text.faint,
                cursor: 'pointer',
                fontSize: 10,
                padding: '2px 6px',
              }}
            >
              Stop
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        {/* Checkbox - Hidden for Failed tasks */}
        {!isFailed && (
          <div
            onClick={e => canEdit && onToggle(task.id, e)}
            style={{
              width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 2,
              border: `1.5px solid ${isDone ? theme.status.low.text : theme.text.faint}`,
              backgroundColor: isDone ? theme.status.low.text : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: canEdit ? 'pointer' : 'default',
              transition: 'all 0.15s',
            }}
          >
            {isDone && <span style={{ color: 'white' }}>{Icon.check}</span>}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <div style={{
            fontSize: 13, fontWeight: 500, lineHeight: 1.4,
            color: isDone ? theme.text.muted : theme.text.primary,
            textDecoration: isDone ? 'line-through' : 'none',
            marginBottom: 6,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {task.title}
          </div>

          {/* Priority + Comments + Deadline Row */}
          {!isDone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <PriorityPill priority={task.priority} />
              {comments > 0 && <span style={{ fontSize: 11, color: theme.text.faint }}>💬 {comments}</span>}
              <div style={{ flex: 1 }} />
              {task.deadline && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 6,
                  backgroundColor: isOverdue ? theme.status.high.bg : theme.bg.hover,
                  color: isOverdue ? theme.status.high.text : theme.text.muted
                }}>
                  {formatDate(task.deadline)}
                </span>
              )}
            </div>
          )}

          {/* Assignees Row - Photo + Name */}
          {!isDone && task.assignees.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {task.assignees.slice(0, 3).map(a => (
                <button
                  key={a.id}
                  onClick={(e) => { e.stopPropagation(); onMemberClick?.(a.id) }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <Avatar name={`${a.full_name} ${a.surname}`} size={20} />
                  <span style={{ fontSize: 11, color: theme.accent.primary }}>{a.full_name}</span>
                </button>
              ))}
              {task.assignees.length > 3 && <span style={{ fontSize: 11, color: theme.text.faint }}>+{task.assignees.length - 3}</span>}
            </div>
          )}

          {/* Work on it button - hidden for failed tasks */}
          {!isDone && !isFailed && canWorkOn && !isCurrentUserWorking && hovered && (
            <button
              onClick={handleWorkingToggle}
              style={{
                marginTop: 8,
                padding: '6px 12px',
                backgroundColor: theme.accent.muted,
                border: `1px solid ${theme.accent.primary}`,
                borderRadius: theme.radius.sm,
                color: theme.accent.primary,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>▶</span> I&apos;m working on this
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ MODALS ============
function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }} onClick={onClose}>
      <div style={{ backgroundColor: theme.bg.panel, borderRadius: theme.radius.xl, width: '100%', maxWidth: wide ? 640 : 420, maxHeight: '85vh', overflow: 'hidden', boxShadow: theme.shadow.lg }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${theme.border.subtle}` }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.text.faint, cursor: 'pointer' }}>{Icon.close}</button>
        </div>
        <div style={{ padding: 20, overflowY: 'auto', maxHeight: 'calc(85vh - 60px)' }}>{children}</div>
      </div>
    </div>
  )
}

function AddTaskModal({ sectionId, onClose, showToast }: { sectionId: string; onClose: () => void; showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM' as Priority, deadline: '', assignees: [] as string[] })
  const members = store.getProjectMembers()

  const toggle = (id: string) => setForm(f => ({ ...f, assignees: f.assignees.includes(id) ? f.assignees.filter(x => x !== id) : [...f.assignees, id] }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    store.createTask(sectionId, { title: form.title.trim(), description: form.description, status: 'ACTIVE', priority: form.priority, assigned_to_list: form.assignees, deadline: form.deadline || null })
    showToast('Task created successfully!', 'success')
    onClose()
  }

  return (
    <Modal title="New task" onClose={onClose}>
      <form onSubmit={submit}>
        <Label>Title</Label>
        <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What needs to be done?" style={inputStyle} autoFocus required />

        <Label style={{ marginTop: 16 }}>Description</Label>
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Add details..." rows={2} style={{ ...inputStyle, resize: 'none' }} />

        <Label style={{ marginTop: 16 }}>Priority</Label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['LOW', 'MEDIUM', 'HIGH'] as Priority[]).map(p => (
            <button key={p} type="button" onClick={() => setForm(f => ({ ...f, priority: p }))} style={{ flex: 1, padding: '8px', borderRadius: theme.radius.sm, border: `1px solid ${form.priority === p ? theme.status[p.toLowerCase() as keyof typeof theme.status].text : theme.border.default}`, backgroundColor: form.priority === p ? theme.status[p.toLowerCase() as keyof typeof theme.status].bg : 'transparent', color: form.priority === p ? theme.status[p.toLowerCase() as keyof typeof theme.status].text : theme.text.muted, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>{p}</button>
          ))}
        </div>

        <Label style={{ marginTop: 16 }}>Deadline</Label>
        <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} style={inputStyle} />

        <Label style={{ marginTop: 16 }}>Assignees</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {members.map(m => (
            <button key={m.user_id} type="button" onClick={() => toggle(m.user_id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: theme.radius.sm, border: `1px solid ${form.assignees.includes(m.user_id) ? theme.accent.primary : theme.border.default}`, backgroundColor: form.assignees.includes(m.user_id) ? theme.accent.muted : 'transparent', color: theme.text.primary, cursor: 'pointer', fontSize: 12 }}>
              <Avatar name={m.user.full_name} size={18} /> {m.user.full_name}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button type="button" onClick={onClose} style={btnSecondary}>Cancel</button>
          <button type="submit" style={btnPrimarySmall} disabled={!form.title.trim()}>Create</button>
        </div>
      </form>
    </Modal>
  )
}

function TaskDetailModal({ task, onClose, showConfirm }: { task: ExtendedTask; onClose: () => void; showConfirm: (dialog: { title: string; message: string; onConfirm: () => void } | null) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({ title: task.title, description: task.description || '', deadline: task.deadline || '', assignees: task.assigned_to_list || [], priority: task.priority })
  const [comments, setComments] = useState<TaskComment[]>(store.getTaskComments(task.id))
  const [msg, setMsg] = useState('')
  const chatRef = useRef<HTMLDivElement>(null)
  const members = store.getProjectMembers()
  const me = store.getCurrentUser()
  const canEdit = store.canEditSection(task.section_id)
  const canDelete = store.canCurrentUserDelete()
  const canWorkOn = store.canWorkOnTask(task.id)
  const isCurrentUserWorking = store.isCurrentUserWorkingOn(task.id)
  const [liveTask, setLiveTask] = useState<ExtendedTask>(store.getTask(task.id) || task)
  const isEditingTask = isEditing // Alias for clarity

  // Subscribe to task updates
  useEffect(() => {
    const update = () => {
      const t = store.getTask(task.id)
      if (t) setLiveTask({ ...t })
      setComments(store.getTaskComments(task.id))
    }
    update() // Initial fetch
    return store.subscribe(update)
  }, [task.id])

  // Get assignee details
  const assigneeDetails = (liveTask.assigned_to_list || []).map(id => members.find(m => m.user_id === id)).filter(Boolean)

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight }, [comments])

  // Sync form with live task when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setForm({
        title: liveTask.title,
        description: liveTask.description || '',
        deadline: liveTask.deadline || '',
        assignees: liveTask.assigned_to_list || [],
        priority: liveTask.priority
      })
    }
  }, [isEditing, liveTask])

  const toggle = (id: string) => {
    const list = form.assignees.includes(id) ? form.assignees.filter(x => x !== id) : [...form.assignees, id]
    setForm(f => ({ ...f, assignees: list }))
  }

  const saveChanges = () => {
    store.updateTask(liveTask.id, {
      title: form.title,
      description: form.description || null,
      deadline: form.deadline || null,
      priority: form.priority,
      assigned_to_list: form.assignees
    })
    setIsEditing(false)
  }

  const send = () => {
    if (!msg.trim()) return
    setComments([...comments, store.addTaskComment(liveTask.id, msg.trim())])
    setMsg('')
  }

  const priorityLabel = { LOW: { text: 'Low', color: theme.status.low.text }, MEDIUM: { text: 'Medium', color: theme.status.medium.text }, HIGH: { text: 'High', color: theme.status.high.text } }

  return (
    <Modal title={isEditing ? 'Edit Task' : liveTask.title} onClose={onClose} wide>
      <div style={{ display: 'grid', gridTemplateColumns: isEditing ? '1fr' : '1fr 240px', gap: 24 }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {isEditing ? (
            // ========== EDIT MODE ==========
            <>
              <Label>Title</Label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} />

              <Label style={{ marginTop: 16 }}>Description</Label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'none' }} placeholder="Add description..." />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div>
                  <Label>Priority</Label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['LOW', 'MEDIUM', 'HIGH'] as Priority[]).map(p => (
                      <button key={p} type="button" onClick={() => setForm(f => ({ ...f, priority: p }))} style={{ flex: 1, padding: '6px', borderRadius: theme.radius.sm, border: `1px solid ${form.priority === p ? theme.status[p.toLowerCase() as keyof typeof theme.status].text : theme.border.default}`, backgroundColor: form.priority === p ? theme.status[p.toLowerCase() as keyof typeof theme.status].bg : 'transparent', color: form.priority === p ? theme.status[p.toLowerCase() as keyof typeof theme.status].text : theme.text.muted, cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>{p}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Deadline</Label>
                  <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} style={inputStyle} />
                </div>
              </div>

              <Label style={{ marginTop: 16 }}>Assignees</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {members.map(m => (
                  <button key={m.user_id} type="button" onClick={() => toggle(m.user_id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: theme.radius.sm, border: `1px solid ${form.assignees.includes(m.user_id) ? theme.accent.primary : theme.border.default}`, backgroundColor: form.assignees.includes(m.user_id) ? theme.accent.muted : 'transparent', color: theme.text.primary, cursor: 'pointer', fontSize: 11 }}>
                    <Avatar name={m.user.full_name} size={16} /> {m.user.full_name}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${theme.border.subtle}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={() => setIsEditing(false)} style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12 }}>Cancel</button>
                <button onClick={saveChanges} style={{ ...btnPrimarySmall, padding: '6px 12px', fontSize: 12 }}>Save Changes</button>
              </div>
            </>
          ) : (
            // ========== VIEW MODE ==========
            <>
              {/* Description */}
              {liveTask.description ? (
                <div style={{ marginBottom: 20 }}>
                  <Label>Description</Label>
                  <p style={{ fontSize: 13, color: theme.text.secondary, lineHeight: 1.6, margin: 0 }}>{liveTask.description}</p>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: theme.text.faint, fontStyle: 'italic', marginBottom: 20 }}>No description</p>
              )}

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: theme.text.muted }}>Priority</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: priorityLabel[liveTask.priority].color }}>{priorityLabel[liveTask.priority].text}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: theme.text.muted }}>Status</span>
                  <span style={{ fontSize: 12, color: liveTask.status === 'DONE' ? theme.status.low.text : theme.text.primary }}>{liveTask.status === 'DONE' ? 'Completed' : 'Active'}</span>
                </div>
                {liveTask.deadline && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: theme.text.muted }}>Deadline</span>
                    <span style={{ fontSize: 12, color: theme.text.primary }}>{new Date(liveTask.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
              </div>

              {/* Assignees */}
              {assigneeDetails.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <Label>Assignees</Label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {assigneeDetails.map(m => m && (
                      <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', backgroundColor: theme.bg.surface, borderRadius: theme.radius.sm }}>
                        <Avatar name={m.user.full_name} size={24} />
                        <span style={{ fontSize: 12, color: theme.text.primary }}>{m.user.full_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${theme.border.subtle}`, display: 'flex', alignItems: 'center', gap: 10, height: 42 }}>
                {canDelete && (
                  <button onClick={() => showConfirm({ title: 'Delete Task', message: `Are you sure you want to delete "${liveTask.title}"?`, onConfirm: () => { store.deleteTask(liveTask.id); onClose() } })} style={{ ...btnSecondary, color: theme.status.high.text, padding: '6px 12px', fontSize: 13, flex: 1, justifyContent: 'center', whiteSpace: 'nowrap' }}>{Icon.trash} Delete</button>
                )}
                {canEdit && (
                  <button onClick={() => setIsEditing(true)} style={{ ...btnSecondary, padding: '6px 12px', fontSize: 13, flex: 1, justifyContent: 'center', whiteSpace: 'nowrap' }}>{Icon.settings} Edit</button>
                )}
                {/* Work on it / Stop working button */}
                {liveTask.status !== 'DONE' && liveTask.status !== 'FAILED' && canWorkOn && (
                  isCurrentUserWorking ? (
                    <button onClick={() => { store.stopWorkingOn(liveTask.id) }} style={{ ...btnSecondary, color: theme.text.muted, padding: '6px 12px', fontSize: 13, flex: 1, justifyContent: 'center', minWidth: 'auto', whiteSpace: 'nowrap' }}>⏹ Stop Working</button>
                  ) : (
                    <button onClick={() => { store.startWorkingOn(liveTask.id) }} style={{ ...btnSecondary, color: theme.accent.primary, padding: '6px 12px', fontSize: 13, flex: 1, justifyContent: 'center', minWidth: 'auto', whiteSpace: 'nowrap' }}>▶ Work on this</button>
                  )
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: Chat */}
        {/* Right: Chat - Hide when editing */}
        {!isEditing && (
          <div style={{ borderLeft: `1px solid ${theme.border.subtle}`, paddingLeft: 20, display: 'flex', flexDirection: 'column' }}>
            <Label style={{ marginBottom: 12 }}>💬 Comments</Label>
            <div ref={chatRef} style={{ flex: 'none', overflowY: 'auto', height: 300, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
              {comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: theme.text.faint, fontSize: 12 }}>No comments yet</div>
              ) : comments.map(c => {
                const isMe = c.user_id === me?.id
                return (
                  <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ fontSize: 10, color: theme.text.faint, marginBottom: 4 }}>{isMe ? 'You' : c.user_name}</div>
                    <div style={{ maxWidth: '90%', padding: '8px 12px', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px', backgroundColor: isMe ? theme.accent.primary : theme.bg.surface, color: isMe ? 'white' : theme.text.primary, fontSize: 12 }}>{c.text}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${theme.border.subtle}`, display: 'flex', alignItems: 'center', gap: 8, height: 42 }}>
              <input type="text" value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Message..." style={{ ...inputStyle, flex: 1, padding: '0 16px', fontSize: 13, height: '100%' }} />
              <button onClick={send} style={{ ...btnPrimarySmall, padding: '0 16px', fontSize: 13, height: '100%', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center' }} disabled={!msg.trim()}>{Icon.send}</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function NewProjectModal({ onClose, showToast }: { onClose: () => void; showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [name, setName] = useState('')
  return (
    <Modal title="New project" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (name.trim()) { store.createProject(name.trim()); showToast('Project created successfully!', 'success'); onClose() } }}>
        <Label>Name</Label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Project name" style={inputStyle} autoFocus />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button type="button" onClick={onClose} style={btnSecondary}>Cancel</button>
          <button type="submit" style={btnPrimarySmall}>Create</button>
        </div>
      </form>
    </Modal>
  )
}

function NewSectionModal({ onClose, showToast }: { onClose: () => void; showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#06b6d4']
  const [name, setName] = useState('')
  const [color, setColor] = useState(colors[0])
  const [roles, setRoles] = useState<string[]>(['Owner'])
  const projectRoles = store.getProjectRoles()

  const toggle = (r: string) => { if (r !== 'Owner') setRoles(rs => rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r]) }

  return (
    <Modal title="New section" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (name.trim()) { store.createSection(name.trim(), color, roles); showToast('Section created successfully!', 'success'); onClose() } }}>
        <Label>Name</Label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Backend, Design" style={inputStyle} autoFocus />
        <Label style={{ marginTop: 16 }}>Color</Label>
        <div style={{ display: 'flex', gap: 8 }}>
          {colors.map(c => <button key={c} type="button" onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: c, border: color === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer' }} />)}
        </div>
        <Label style={{ marginTop: 16 }}>Who can edit?</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {projectRoles.map(r => (
            <button key={r.id} type="button" onClick={() => toggle(r.name)} style={{ padding: '6px 10px', borderRadius: theme.radius.sm, border: `1px solid ${roles.includes(r.name) ? theme.accent.primary : theme.border.default}`, backgroundColor: roles.includes(r.name) ? theme.accent.muted : 'transparent', color: theme.text.primary, cursor: r.name === 'Owner' ? 'default' : 'pointer', fontSize: 11, opacity: r.name === 'Owner' ? 0.6 : 1 }}>{r.name === 'Owner' ? '👑 ' : ''}{r.name}</button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button type="button" onClick={onClose} style={btnSecondary}>Cancel</button>
          <button type="submit" style={{ ...btnPrimarySmall, backgroundColor: color }}>Create</button>
        </div>
      </form>
    </Modal>
  )
}

function JoinModal({ onClose, showToast }: { onClose: () => void; showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  return (
    <Modal title="Join project" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (store.joinProject(code.trim())) { showToast('Successfully joined project!', 'success'); onClose() } else { setError('Invalid invite code'); showToast('Invalid invite code!', 'error') } }}>
        {error && <div style={{ backgroundColor: theme.status.high.bg, borderRadius: theme.radius.sm, padding: '10px 14px', marginBottom: 16, color: theme.status.high.text, fontSize: 13 }}>{error}</div>}
        <Label>Invite code</Label>
        <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="Enter code" style={inputStyle} autoFocus />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button type="button" onClick={onClose} style={btnSecondary}>Cancel</button>
          <button type="submit" style={btnPrimarySmall}>Join</button>
        </div>
      </form>
    </Modal>
  )
}

function EditSectionModal({ section, onClose }: { section: Section; onClose: () => void }) {
  const [name, setName] = useState(section.name)
  const [roles, setRoles] = useState<string[]>(section.allowed_roles)
  const projectRoles = store.getProjectRoles()
  const toggle = (r: string) => { if (r !== 'Owner') setRoles(rs => rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r]) }
  const save = () => {
    store.updateSection(section.id, { name: name.trim() || section.name, allowed_roles: roles })
    onClose()
  }

  return (
    <Modal title="Edit Section" onClose={onClose}>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 12, color: theme.text.muted, marginBottom: 6 }}>Section Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Section name..."
          style={{ ...inputStyle, width: '100%' }}
        />
      </div>
      <p style={{ fontSize: 12, color: theme.text.muted, marginBottom: 10 }}>Select roles that can edit tasks in this section.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {projectRoles.map(r => (
          <label key={r.id} onClick={() => toggle(r.name)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: theme.radius.sm, backgroundColor: roles.includes(r.name) ? theme.accent.muted : theme.bg.surface, border: `1px solid ${roles.includes(r.name) ? theme.accent.primary : 'transparent'}`, cursor: r.name === 'Owner' ? 'default' : 'pointer' }}>
            <input type="checkbox" checked={roles.includes(r.name)} onChange={() => { }} disabled={r.name === 'Owner'} style={{ accentColor: theme.accent.primary }} />
            <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: r.color }} />
            <span style={{ flex: 1, fontSize: 13 }}>{r.name}</span>
            {r.name === 'Owner' && <span style={{ fontSize: 10, color: theme.text.faint }}>Always</span>}
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={save} style={btnPrimarySmall}>Save</button>
      </div>
    </Modal>
  )
}

const PERMISSION_LABELS: { key: keyof RolePermissions; label: string; desc: string }[] = [
  { key: 'is_admin', label: 'Full Admin', desc: 'All permissions (overrides below)' },
  { key: 'can_invite', label: 'Invite Members', desc: 'Can send invitations' },
  { key: 'can_add_section', label: 'Add Sections', desc: 'Can create new sections/topics' },
  { key: 'can_delete_member', label: 'Remove Members', desc: 'Can remove team members' },
  { key: 'can_delete_task', label: 'Delete Tasks', desc: 'Can delete any task' },
  { key: 'can_edit_roles', label: 'Edit Roles', desc: 'Can modify role permissions' },
]

function MembersModal({ members, isOwner, onClose, showConfirm }: { members: (ProjectMember & { user: ExtendedUser })[]; isOwner: boolean; onClose: () => void; showConfirm: (dialog: { title: string; message: string; onConfirm: () => void } | null) => void }) {
  const [projectRoles, setProjectRoles] = useState<ProjectRole[]>(store.getProjectRoles())
  const [adding, setAdding] = useState(false)
  const [newRole, setNewRole] = useState<{ name: string; permissions: RolePermissions }>({ name: '', permissions: { ...DEFAULT_PERMISSIONS } })
  const [editing, setEditing] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<ProjectRole | null>(null)
  const [selectedMember, setSelectedMember] = useState<(ProjectMember & { user: ExtendedUser }) | null>(null)
  const [, forceUpdate] = useState(0)
  const project = store.getCurrentProject()

  const addRole = () => {
    if (newRole.name.trim()) {
      store.addProjectRole(newRole.name.trim(), undefined, newRole.permissions)
      setProjectRoles(store.getProjectRoles())
      setNewRole({ name: '', permissions: { ...DEFAULT_PERMISSIONS } })
      setAdding(false)
    }
  }
  const deleteRole = (id: string, name: string, roleName: string) => {
    showConfirm({
      title: 'Delete Role',
      message: `Are you sure you want to delete the "${roleName}" role? Members with this role will be changed to "Member".`,
      onConfirm: () => { store.deleteProjectRole(id); setProjectRoles(store.getProjectRoles()) }
    })
  }
  const updatePermission = (roleId: string, permission: keyof RolePermissions, value: boolean) => {
    store.updateRolePermissions(roleId, { [permission]: value })
    setProjectRoles(store.getProjectRoles())
    if (editingRole && editingRole.id === roleId) {
      const updated = store.getProjectRoles().find(r => r.id === roleId)
      if (updated) setEditingRole(updated)
    }
  }
  const changeRole = (userId: string, role: string) => { store.updateMemberRole(userId, role); setEditing(null) }
  const removeMember = (userId: string, userName: string) => {
    showConfirm({
      title: 'Remove Member',
      message: `Are you sure you want to remove ${userName} from this project? They will lose access to all tasks.`,
      onConfirm: () => { store.removeMember(userId); forceUpdate(n => n + 1) }
    })
  }
  const list = store.getProjectMembers()

  const formatLastActive = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <Modal title="Team" onClose={onClose} wide={isOwner || store.canCurrentUserEditRoles()}>
      {selectedMember ? (
        // Member Detail View - Uses shared ProfileCard
        <div style={{ margin: -20 }}>
          <ProfileCard member={selectedMember} onClose={() => setSelectedMember(null)} style={{ maxWidth: '100%', borderRadius: 0 }} />
        </div>
      ) : (
        // Members List View
        <div style={{ display: 'grid', gridTemplateColumns: (isOwner || store.canCurrentUserEditRoles()) ? '1fr 240px' : '1fr', gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: theme.text.faint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Members · {list.length}</div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {list.map(m => {
                const creator = project?.created_by === m.user_id
                return (
                  <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${theme.border.subtle}` }}>
                    {/* Clickable avatar and name */}
                    <button onClick={() => setSelectedMember(m)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', flex: 1, textAlign: 'left' }}>
                      <Avatar name={`${m.user.full_name} ${m.user.surname}`} size={36} showOnline />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: theme.text.primary, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {m.user.full_name}
                          {creator && <span style={{ fontSize: 10 }}>👑</span>}
                          <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 400 }}>🔥 {m.user.streak}</span>
                        </div>
                        <div style={{ fontSize: 11, color: theme.text.faint }}>@{m.user.username}</div>
                      </div>
                    </button>
                    {store.canCurrentUserEditRoles() && editing === m.user_id && !creator ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 180 }}>
                        {projectRoles.map(r => {
                          const hasRole = m.role_titles.includes(r.name)
                          return (
                            <button
                              key={r.id}
                              onClick={() => store.toggleMemberRole(m.user_id, r.name)}
                              style={{ padding: '3px 6px', borderRadius: 4, border: `1px solid ${hasRole ? theme.accent.primary : theme.border.default}`, backgroundColor: hasRole ? theme.accent.muted : 'transparent', color: theme.text.primary, cursor: 'pointer', fontSize: 10 }}
                            >
                              {hasRole && '✓ '}{r.name}
                            </button>
                          )
                        })}
                        <button onClick={() => setEditing(null)} style={{ padding: '3px 6px', borderRadius: 4, border: `1px solid ${theme.border.default}`, backgroundColor: 'transparent', color: theme.text.faint, cursor: 'pointer', fontSize: 10 }}>Done</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={(e) => { e.stopPropagation(); store.canCurrentUserEditRoles() && !creator && setEditing(m.user_id) }} style={{ fontSize: 11, fontWeight: 500, color: theme.accent.primary, backgroundColor: theme.accent.muted, padding: '5px 10px', borderRadius: 6, border: 'none', cursor: store.canCurrentUserEditRoles() && !creator ? 'pointer' : 'default' }}>{m.role_titles.join(', ')}</button>
                        {/* Remove member button - needs can_delete_member permission, can't remove creator */}
                        {store.canCurrentUserDeleteMember() && !creator && (
                          <button onClick={(e) => { e.stopPropagation(); removeMember(m.user_id, m.user.full_name) }} style={{ background: 'none', border: 'none', color: theme.status.high.text, cursor: 'pointer', padding: 4, opacity: 0.7, fontSize: 12 }} title="Remove from team">
                            {Icon.trash}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          {(isOwner || store.canCurrentUserEditRoles()) && (
            <div style={{ borderLeft: `1px solid ${theme.border.subtle}`, paddingLeft: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: theme.text.faint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Roles</div>

              {editingRole ? (
                // Editing role permissions
                <div>
                  <button onClick={() => setEditingRole(null)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: theme.text.muted, cursor: 'pointer', fontSize: 11, marginBottom: 12 }}>← Back</button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: editingRole.color }} />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{editingRole.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 10 }}>Permissions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {PERMISSION_LABELS.map(p => {
                      const isAdmin = editingRole.permissions.is_admin
                      const checked = isAdmin || editingRole.permissions[p.key]
                      const disabled = p.key !== 'is_admin' && isAdmin
                      return (
                        <label key={p.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', backgroundColor: theme.bg.surface, borderRadius: theme.radius.sm, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => updatePermission(editingRole.id, p.key, !editingRole.permissions[p.key])}
                            style={{ accentColor: theme.accent.primary, marginTop: 2 }}
                          />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 500 }}>{p.label}</div>
                            <div style={{ fontSize: 10, color: theme.text.faint }}>{p.desc}</div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {projectRoles.map(r => {
                      const permCount = r.permissions.is_admin ? 'Admin' : Object.values(r.permissions).filter(Boolean).length + ' perms'
                      return (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', backgroundColor: theme.bg.surface, borderRadius: theme.radius.sm }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: r.color }} />
                          <span style={{ flex: 1, fontSize: 12 }}>{r.name}</span>
                          {r.name === 'Owner' ? (
                            <span style={{ fontSize: 9, color: theme.accent.primary, backgroundColor: theme.accent.muted, padding: '2px 6px', borderRadius: 4 }}>Admin</span>
                          ) : (
                            <>
                              <span style={{ fontSize: 9, color: r.permissions.is_admin ? theme.accent.primary : theme.text.faint, backgroundColor: r.permissions.is_admin ? theme.accent.muted : 'transparent', padding: '2px 6px', borderRadius: 4 }}>{permCount}</span>
                              <button onClick={() => setEditingRole(r)} style={{ background: 'none', border: 'none', color: theme.text.faint, cursor: 'pointer', fontSize: 10, padding: 2 }} title="Edit permissions">{Icon.settings}</button>
                              <button onClick={() => deleteRole(r.id, r.name, r.name)} style={{ background: 'none', border: 'none', color: theme.text.faint, cursor: 'pointer', fontSize: 10, padding: 2 }} title="Delete role">×</button>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {adding ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, backgroundColor: theme.bg.surface, borderRadius: theme.radius.sm }}>
                      <input type="text" value={newRole.name} onChange={e => setNewRole(r => ({ ...r, name: e.target.value }))} placeholder="Role name" style={{ ...inputStyle, padding: '8px 10px' }} autoFocus onKeyDown={e => e.key === 'Enter' && addRole()} />
                      <div style={{ fontSize: 10, color: theme.text.muted, marginTop: 4 }}>Permissions</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {PERMISSION_LABELS.map(p => {
                          const isAdmin = newRole.permissions.is_admin
                          const checked = isAdmin || newRole.permissions[p.key]
                          const disabled = p.key !== 'is_admin' && isAdmin
                          return (
                            <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: disabled ? theme.text.faint : theme.text.muted, cursor: disabled ? 'default' : 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={() => setNewRole(r => ({ ...r, permissions: { ...r.permissions, [p.key]: !r.permissions[p.key] } }))}
                                style={{ accentColor: theme.accent.primary }}
                              />
                              {p.label}
                            </label>
                          )
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button onClick={() => { setAdding(false); setNewRole({ name: '', permissions: { ...DEFAULT_PERMISSIONS } }) }} style={{ ...btnSecondary, flex: 1, padding: '6px', fontSize: 11 }}>Cancel</button>
                        <button onClick={addRole} style={{ ...btnPrimarySmall, flex: 1, padding: '6px', fontSize: 11 }}>Add</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAdding(true)} style={{ width: '100%', padding: 10, backgroundColor: 'transparent', border: `1px dashed ${theme.border.default}`, borderRadius: theme.radius.sm, color: theme.text.faint, cursor: 'pointer', fontSize: 11 }}>{Icon.plus} Add role</button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
      {!selectedMember && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: `1px solid ${theme.border.subtle}` }}>
          <button onClick={onClose} style={btnPrimarySmall}>Done</button>
        </div>
      )}
    </Modal>
  )
}

// ============ CONFIRM DIALOG ============
function ConfirmDialog({ title, message, onConfirm, onCancel }: { title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 24 }} onClick={onCancel}>
      <div style={{ backgroundColor: theme.bg.panel, borderRadius: theme.radius.lg, width: '100%', maxWidth: 380, overflow: 'hidden', boxShadow: theme.shadow.lg }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: theme.text.primary, marginBottom: 8 }}>{title}</h3>
          <p style={{ fontSize: 14, color: theme.text.secondary, lineHeight: 1.5 }}>{message}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '16px 24px', borderTop: `1px solid ${theme.border.subtle}`, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={btnSecondary}>Cancel</button>
          <button onClick={onConfirm} style={{ ...btnPrimarySmall, backgroundColor: theme.status.high.text }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

// ============ MEMBER PROFILE MODAL ============
function MemberProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const allMembers = store.getProjectMembers()
  const member = allMembers.find(m => m.user_id === userId)

  if (!member) return null

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 360, boxShadow: theme.shadow.lg }} onClick={e => e.stopPropagation()}>
        <ProfileCard member={member} onClose={onClose} />
      </div>
    </div>
  )
}

// ============ SEARCH MODAL ============
function SearchModal({ onClose, onSelectTask }: { onClose: () => void; onSelectTask: (task: ExtendedTask) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<(ExtendedTask & { assignees: (ExtendedUser & { role_titles: string[] })[], sectionName: string, sectionColor: string })[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (query.trim().length >= 1) {
      setResults(store.searchTasks(query))
    } else {
      setResults([])
    }
  }, [query])

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, paddingTop: 100 }} onClick={onClose}>
      <div style={{ backgroundColor: theme.bg.panel, borderRadius: theme.radius.xl, width: '100%', maxWidth: 560, overflow: 'hidden', boxShadow: theme.shadow.lg }} onClick={e => e.stopPropagation()}>
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${theme.border.subtle}` }}>
          <span style={{ color: theme.text.faint }}>{Icon.search}</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks, assignees..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: theme.text.primary, fontSize: 15 }}
          />
          <kbd style={{ fontSize: 11, color: theme.text.faint, backgroundColor: theme.bg.surface, padding: '3px 6px', borderRadius: 4 }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {query.trim().length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: theme.text.faint, fontSize: 13 }}>
              <div style={{ marginBottom: 8 }}>Start typing to search tasks</div>
              <div style={{ fontSize: 11 }}>Search by title, description, or assignee name</div>
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: theme.text.faint, fontSize: 13 }}>
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            <div style={{ padding: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: theme.text.faint, padding: '8px 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tasks · {results.length}
              </div>
              {results.map(task => (
                <button
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px',
                    marginBottom: 2,
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: theme.radius.sm,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = theme.bg.hover}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* Status indicator */}
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, marginTop: 2, flexShrink: 0,
                    border: `1.5px solid ${task.status === 'DONE' ? theme.status.low.text : theme.text.faint}`,
                    backgroundColor: task.status === 'DONE' ? theme.status.low.text : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {task.status === 'DONE' && <span style={{ color: 'white' }}>{Icon.check}</span>}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title */}
                    <div style={{
                      fontSize: 13, fontWeight: 500, color: task.status === 'DONE' ? theme.text.muted : theme.text.primary,
                      textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
                      marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {task.title}
                    </div>

                    {/* Meta row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {/* Section badge */}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: theme.text.muted }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: task.sectionColor }} />
                        {task.sectionName}
                      </span>

                      {/* Priority */}
                      <PriorityPill priority={task.priority} />

                      {/* Deadline */}
                      {task.deadline && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: theme.text.faint }}>
                          {Icon.calendar} {formatDate(task.deadline)}
                        </span>
                      )}

                      {/* Assignees */}
                      {task.assignees.length > 0 && (
                        <span style={{ fontSize: 11, color: theme.text.muted }}>
                          → {task.assignees.map(a => a.full_name).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${theme.border.subtle}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: theme.text.faint }}>
            <kbd style={{ backgroundColor: theme.bg.surface, padding: '2px 5px', borderRadius: 3, marginRight: 4 }}>↑↓</kbd> Navigate
            <kbd style={{ backgroundColor: theme.bg.surface, padding: '2px 5px', borderRadius: 3, marginLeft: 12, marginRight: 4 }}>Enter</kbd> Open
          </div>
          <button onClick={onClose} style={{ fontSize: 12, color: theme.text.muted, background: 'none', border: 'none', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ============ STYLES ============
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', backgroundColor: theme.bg.surface, border: `1px solid ${theme.border.default}`, borderRadius: theme.radius.sm, color: theme.text.primary, fontSize: 13, outline: 'none', transition: 'border 0.15s' }
const Label = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: theme.text.secondary, marginBottom: 8, ...style }}>{children}</label>
const btnPrimary: React.CSSProperties = { width: '100%', padding: '11px 14px', backgroundColor: theme.accent.primary, border: `1px solid ${theme.accent.primary}`, borderRadius: theme.radius.sm, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 500 }
const btnPrimarySmall: React.CSSProperties = { padding: '8px 16px', backgroundColor: theme.accent.primary, border: 'none', borderRadius: theme.radius.sm, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }
const btnSecondary: React.CSSProperties = { padding: '8px 14px', backgroundColor: 'transparent', border: `1px solid ${theme.border.default}`, borderRadius: theme.radius.sm, color: theme.text.primary, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }
