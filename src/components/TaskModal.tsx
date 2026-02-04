'use client'

import { useState, useEffect } from 'react'
import type { Task, Priority, User, Comment, ProjectMember } from '@/types/database'
import { store } from '@/lib/store'

interface TaskModalProps {
  task: Task
  onClose: () => void
  onUpdate: (taskId: string, updates: Partial<Task>) => void
  onDelete: (taskId: string) => void
  onToggle: () => void
}

const priorities: { value: Priority; label: string; dot: string; color: string }[] = [
  { value: 'HIGH', label: 'High', dot: '🔴', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'MEDIUM', label: 'Medium', dot: '🟡', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'LOW', label: 'Low', dot: '🟢', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
]

export default function TaskModal({ task, onClose, onUpdate, onDelete, onToggle }: TaskModalProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [dueDate, setDueDate] = useState(task.due_date?.split('T')[0] || '')
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '')
  const [members, setMembers] = useState<(ProjectMember & { user: User })[]>([])
  const [comments, setComments] = useState<(Comment & { user: User })[]>([])
  const [newComment, setNewComment] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    setMembers(store.getProjectMembers())
    setComments(store.getComments(task.id))
    
    const unsubscribe = store.subscribe(() => {
      setComments(store.getComments(task.id))
    })
    return unsubscribe
  }, [task.id])

  const handleSave = () => {
    onUpdate(task.id, {
      title,
      description: description || null,
      priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      assigned_to: assignedTo || null,
    })
  }

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    store.addComment(task.id, newComment.trim())
    setNewComment('')
  }

  const isDone = task.status === 'DONE'

  return (
    <>
      {/* ===== BACKDROP ===== */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* ===== MODAL (Fixed Center) ===== */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-gray-800 border border-gray-700 w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          
          {/* ===== HEADER ===== */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isDone}
                onChange={onToggle}
              />
              <span className={`text-sm px-2 py-0.5 rounded-full ${
                isDone 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-orange-500/20 text-orange-400'
              }`}>
                {isDone ? '✅ Done' : '🔥 Active'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ===== CONTENT (Scrollable) ===== */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Title */}
            <div>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={handleSave}
                className="w-full text-xl font-bold bg-transparent text-white focus:outline-none"
                placeholder="Task title..."
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                onBlur={handleSave}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                placeholder="Add a description..."
              />
            </div>

            {/* Priority & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Priority */}
              <div>
                <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                  Priority
                </label>
                <div className="flex gap-2">
                  {priorities.map(p => (
                    <button
                      key={p.value}
                      onClick={() => {
                        setPriority(p.value)
                        onUpdate(task.id, { priority: p.value })
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${
                        priority === p.value 
                          ? p.color 
                          : 'border-gray-700 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {p.dot} {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => {
                    setDueDate(e.target.value)
                    onUpdate(task.id, { due_date: e.target.value ? new Date(e.target.value).toISOString() : null })
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Assignee
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                
                {/* Unassigned option */}
                <button
                  onClick={() => {
                    setAssignedTo('')
                    onUpdate(task.id, { assigned_to: null })
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    !assignedTo 
                      ? 'border-cyan-500/50 bg-cyan-500/10' 
                      : 'border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-gray-400">Unassigned</span>
                </button>
                
                {/* Team members */}
                {members.map(member => (
                  <button
                    key={member.user_id}
                    onClick={() => {
                      setAssignedTo(member.user_id)
                      onUpdate(task.id, { assigned_to: member.user_id })
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      assignedTo === member.user_id 
                        ? 'border-cyan-500/50 bg-cyan-500/10' 
                        : 'border-gray-700 hover:bg-gray-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
                      <img
                        src={member.user.avatar_url || ''}
                        alt={member.user.full_name}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{member.user.full_name}</p>
                      <p className="text-gray-500 text-xs truncate">🏷️ {member.role_title}</p>
                    </div>
                    {assignedTo === member.user_id && (
                      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div>
              <label className="block text-sm text-gray-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Comments ({comments.length})
              </label>
              
              {/* Comment list */}
              <div className="space-y-3 mb-4">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
                      <img
                        src={comment.user.avatar_url || ''}
                        alt={comment.user.full_name}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-white text-sm font-medium">{comment.user.full_name}</span>
                        <span className="text-gray-500 text-xs">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mt-1">{comment.message}</p>
                    </div>
                  </div>
                ))}
                
                {comments.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No comments yet</p>
                )}
              </div>

              {/* Add comment form */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </div>

          {/* ===== FOOTER ===== */}
          <div className="p-6 border-t border-gray-700 flex justify-between">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-3">
                <span className="text-red-400 text-sm">Delete this task?</span>
                <button
                  onClick={() => onDelete(task.id)}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Task
              </button>
            )}
            
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white transition-colors font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
