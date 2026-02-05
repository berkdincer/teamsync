'use client'

import { useEffect } from 'react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#080c14',
            color: '#f1f5f9',
            fontFamily: 'Inter, sans-serif'
        }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>Something went wrong!</h2>
            <p style={{ color: '#94a3b8', marginBottom: '24px', maxWidth: '400px', textAlign: 'center' }}>
                {error.message || 'An unexpected error occurred. Please try again.'}
            </p>
            <button
                onClick={reset}
                style={{
                    padding: '10px 20px',
                    backgroundColor: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 500
                }}
            >
                Try again
            </button>
        </div>
    )
}
