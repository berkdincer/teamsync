'use client'

import './globals.css'
import { ToastProvider } from '@/components/Toast'
import { AbortErrorHandler } from '@/components/AbortErrorHandler'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>TeamSync - Simple Task Management</title>
        <meta name="description" content="Zero friction task management for small teams." />
      </head>
      <body style={{ margin: 0, padding: 0, minHeight: '100vh', backgroundColor: '#111827' }}>
        <AbortErrorHandler />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
