'use client'

import type { Task, Priority } from '@/types/database'

interface TaskCardProps {
  task: Task
  onToggle: () => void
  onClick: () => void
  isDone?: boolean
}

const priorityConfig: Record<Priority, { label: string; dot: string; bgColor: string }> = {
  HIGH: { label: 'High', dot: '🔴', bgColor: 'bg-red-500/20 text-red-400' },
  MEDIUM: { label: 'Medium', dot: '🟡', bgColor: 'bg-yellow-500/20 text-yellow-400' },
  LOW: { label: 'Low', dot: '🟢', bgColor: 'bg-green-500/20 text-green-400' },
}

function formatDueDate(date: string | null): string {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  
  if (days < 0) return 'Overdue'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return `${days} days`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function TaskCard({ task, onToggle, onClick, isDone }: TaskCardProps) {
  const priority = priorityConfig[task.priority]
  const dueText = formatDueDate(task.due_date)
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isDone

  return (
    <div 
      className={`bg-gray-800 border border-gray-700 rounded-xl p-4 cursor-pointer hover:bg-gray-750 hover:border-gray-600 transition-all ${isDone ? 'opacity-60' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isDone}
          onChange={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5"
        />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          
          {/* Title */}
          <h3 className={`font-medium text-white leading-snug ${isDone ? 'line-through text-gray-500' : ''}`}>
            {task.title}
          </h3>
          
          {/* Meta row */}
          {!isDone && (
            <div className="flex flex-wrap items-center gap-3 mt-2">
              
              {/* Priority Badge */}
              <span className={`text-xs px-2 py-1 rounded-md ${priority.bgColor}`}>
                {priority.dot} {priority.label}
              </span>
              
              {/* Due date */}
              {dueText && (
                <span className={`text-sm flex items-center gap-1 ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{dueText}</span>
                </span>
              )}
            </div>
          )}
          
          {/* Assignee */}
          {task.assignee && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700">
              <div className="w-6 h-6 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
                <img
                  src={task.assignee.avatar_url || ''}
                  alt={task.assignee.full_name}
                  width={24}
                  height={24}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">
                  👤 {task.assignee.full_name}
                </p>
                {task.assignee.role_title && (
                  <p className="text-xs text-gray-500 truncate">
                    🏷️ {task.assignee.role_title}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
