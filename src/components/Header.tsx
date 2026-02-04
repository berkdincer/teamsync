'use client'

import { useState, useEffect } from 'react'
import { store } from '@/lib/store'
import type { Project, User, ProjectMember } from '@/types/database'

export default function Header() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<(ProjectMember & { user: User })[]>([])
  const [showProjectMenu, setShowProjectMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const refresh = () => {
      setCurrentProject(store.getCurrentProject())
      setCurrentUser(store.getCurrentUser())
      setProjects(store.getProjects())
      setMembers(store.getProjectMembers())
    }
    refresh()
    return store.subscribe(refresh)
  }, [])

  const handleCopyInvite = async () => {
    const link = store.generateInviteLink()
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreateProject = () => {
    const name = prompt('Enter project name:')
    if (name) {
      store.createProject(name)
    }
    setShowProjectMenu(false)
  }

  const handleSwitchProject = (projectId: string) => {
    store.setCurrentProject(projectId)
    setShowProjectMenu(false)
  }

  const handleSwitchUser = (userId: string) => {
    store.setCurrentUser(userId)
    setShowUserMenu(false)
  }

  const userRole = currentUser ? store.getMemberRole(currentUser.id) : undefined

  return (
    <>
      {/* Header Bar */}
      <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <span className="text-lg font-bold text-white">T</span>
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                TeamSync
              </span>
            </div>

            {/* Center - Project Selector */}
            <div className="relative">
              <button
                onClick={() => setShowProjectMenu(!showProjectMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-all"
              >
                <span className="text-white font-medium">{currentProject?.name}</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${showProjectMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showProjectMenu && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="p-2">
                    {projects.map(project => (
                      <button
                        key={project.id}
                        onClick={() => handleSwitchProject(project.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          project.id === currentProject?.id
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'text-white hover:bg-gray-700'
                        }`}
                      >
                        {project.name}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-700 p-2">
                    <button
                      onClick={handleCreateProject}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>New Project</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-3">
              
              {/* Copy Invite Link */}
              <button
                onClick={handleCopyInvite}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-all"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-400 text-sm">Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="text-gray-300 text-sm">Copy Invite</span>
                  </>
                )}
              </button>

              {/* Team Members */}
              <button
                onClick={() => setShowMembersModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-all"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="text-gray-300 text-sm">Team</span>
                <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-400">
                  {members.length}
                </span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 pl-3 pr-2 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-all"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-white">{currentUser?.full_name}</p>
                    <p className="text-xs text-cyan-400">{userRole}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-gray-700 overflow-hidden flex-shrink-0">
                    <img
                      src={currentUser?.avatar_url || ''}
                      alt={currentUser?.full_name}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute top-full mt-2 right-0 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
                    <div className="p-3 border-b border-gray-700">
                      <p className="text-white font-medium">{currentUser?.full_name}</p>
                      <p className="text-gray-400 text-sm">{currentUser?.email}</p>
                      <p className="text-cyan-400 text-sm mt-1">{userRole}</p>
                    </div>
                    <div className="p-2">
                      <p className="px-3 py-1 text-xs text-gray-500 uppercase tracking-wider">Switch User (Demo)</p>
                      {store.getUsers().map(user => (
                        <button
                          key={user.id}
                          onClick={() => handleSwitchUser(user.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            user.id === currentUser?.id
                              ? 'bg-cyan-500/20'
                              : 'hover:bg-gray-700'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
                            <img
                              src={user.avatar_url || ''}
                              alt={user.full_name}
                              width={28}
                              height={28}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="text-left">
                            <p className="text-white text-sm">{user.full_name}</p>
                            <p className="text-gray-500 text-xs">{store.getMemberRole(user.id)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-gray-700 p-2">
                      <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Settings</span>
                      </button>
                      <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Members Modal */}
      {showMembersModal && (
        <MembersModal 
          members={members} 
          onClose={() => setShowMembersModal(false)} 
        />
      )}

      {/* Click outside to close menus */}
      {(showProjectMenu || showUserMenu) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setShowProjectMenu(false)
            setShowUserMenu(false)
          }}
        />
      )}
    </>
  )
}

function MembersModal({ 
  members, 
  onClose 
}: { 
  members: (ProjectMember & { user: User })[]
  onClose: () => void 
}) {
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [roleValue, setRoleValue] = useState('')

  const handleEditRole = (userId: string, currentRole: string) => {
    setEditingMember(userId)
    setRoleValue(currentRole)
  }

  const handleSaveRole = (userId: string) => {
    store.updateMemberRole(userId, roleValue)
    setEditingMember(null)
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-gray-800 border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Team Members
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Manage roles and permissions
            </p>
          </div>
          
          {/* Members List */}
          <div className="p-4 max-h-96 overflow-y-auto">
            {members.map(member => (
              <div 
                key={member.user_id} 
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-700/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-700">
                  <img
                    src={member.user.avatar_url || ''}
                    alt={member.user.full_name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{member.user.full_name}</p>
                  {editingMember === member.user_id ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={roleValue}
                        onChange={e => setRoleValue(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveRole(member.user_id)
                          if (e.key === 'Escape') setEditingMember(null)
                        }}
                      />
                      <button
                        onClick={() => handleSaveRole(member.user_id)}
                        className="text-green-400 hover:text-green-300"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEditRole(member.user_id, member.role_title)}
                      className="text-cyan-400 text-sm hover:underline"
                    >
                      🏷️ {member.role_title}
                    </button>
                  )}
                </div>
                <p className="text-gray-500 text-xs">
                  {new Date(member.joined_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
