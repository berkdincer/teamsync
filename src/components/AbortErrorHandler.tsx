'use client'

import { useEffect } from 'react'

export function AbortErrorHandler() {
    useEffect(() => {
        // Global handler for unhandled promise rejections
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            // Check if this is an AbortError
            if (
                event.reason?.name === 'AbortError' ||
                event.reason?.message?.includes('aborted') ||
                event.reason?.message?.includes('signal is aborted')
            ) {
                // Prevent the error from appearing in console
                event.preventDefault()
                console.log('[Global] Suppressed AbortError (expected during navigation/refresh)')
            }
        }

        window.addEventListener('unhandledrejection', handleUnhandledRejection)

        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection)
        }
    }, [])

    return null
}
