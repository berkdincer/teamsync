'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'

// Toast types
type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
    id: string
    message: string
    type: ToastType
    visible: boolean
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

// Toast colors matching the app's theme
const toastStyles: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
    success: {
        bg: '#065f46',
        border: '#10b981',
        text: '#d1fae5',
        icon: '✓'
    },
    error: {
        bg: '#7f1d1d',
        border: '#ef4444',
        text: '#fecaca',
        icon: '✕'
    },
    warning: {
        bg: '#78350f',
        border: '#f59e0b',
        text: '#fef3c7',
        icon: '⚠'
    },
    info: {
        bg: '#1e3a8a',
        border: '#3b82f6',
        text: '#dbeafe',
        icon: 'ℹ'
    },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
    const style = toastStyles[toast.type]
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        // Trigger animation after mount
        requestAnimationFrame(() => {
            setMounted(true)
        })
    }, [])

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 18px',
                backgroundColor: style.bg,
                border: `2px solid ${style.border}`,
                borderRadius: '10px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                maxWidth: '380px',
                minWidth: '280px',
                opacity: mounted && toast.visible ? 1 : 0,
                transform: mounted && toast.visible ? 'translateX(0)' : 'translateX(100px)',
                transition: 'all 0.3s ease-out',
            }}
        >
            <span style={{
                fontSize: '18px',
                fontWeight: 700,
                color: style.text,
            }}>
                {style.icon}
            </span>
            <span style={{
                color: style.text,
                fontSize: '14px',
                fontWeight: 500,
                flex: 1,
            }}>
                {toast.message}
            </span>
            <button
                onClick={onRemove}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: style.text,
                    cursor: 'pointer',
                    padding: '4px',
                    fontSize: '16px',
                    lineHeight: 1,
                    opacity: 0.7,
                }}
            >
                ✕
            </button>
        </div>
    )
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9)
        const newToast: Toast = { id, message, type, visible: true }

        console.log('[Toast] Showing:', message, type) // Debug log

        setToasts(prev => [...prev, newToast])

        // Auto remove after 4 seconds
        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t))
            // Actually remove after fade out animation
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id))
            }, 300)
        }, 4000)
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t))
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 300)
    }, [])

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast Container - Fixed position, high z-index */}
            <div
                id="toast-container"
                style={{
                    position: 'fixed',
                    top: '24px',
                    right: '24px',
                    zIndex: 999999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    pointerEvents: 'auto',
                }}
            >
                {toasts.map(toast => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onRemove={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    )
}
