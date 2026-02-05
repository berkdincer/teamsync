import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/Toast'

export const metadata: Metadata = {
  title: 'TeamSync - Simple Task Management',
  description: 'Zero friction task management for small teams.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, minHeight: '100vh', backgroundColor: '#111827' }}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
