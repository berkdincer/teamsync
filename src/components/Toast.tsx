'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

// Toast types
type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
    id: string
    message: string
    type: ToastType
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        // Return a no-op function if not wrapped (prevents errors during SSR)
        return { showToast: (msg: string, type?: ToastType) => console.log('[Toast fallback]', msg, type) }
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
                animation: 'toastSlideIn 0.3s ease-out forwards',
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

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)

        // Add keyframes to document
        const styleId = 'toast-keyframes'
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style')
            style.id = styleId
            style.textContent = `
                @keyframes toastSlideIn {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
            `
            document.head.appendChild(style)
        }
    }, [])

    if (!mounted) return null

    return createPortal(
        <div
            style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 2147483647,
                display: 'flex',
                flexDirection: 'column-reverse',
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
        </div>,
        document.body
    )
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9)
        const newToast: Toast = { id, message, type }

        console.log('[Toast] Adding:', message, type)

        setToasts(prev => [...prev, newToast])

        // Auto remove after 4 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 4000)
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    )
}
