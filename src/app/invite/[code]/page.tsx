'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Users, ArrowRight, CheckCircle } from 'lucide-react'

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const inviteCode = params.code as string
  const [loading, setLoading] = useState(false)
  const [joined, setJoined] = useState(false)

  const handleJoin = async () => {
    setLoading(true)
    // Simulate joining - in production, this would validate the invite code
    // and add the user to the project
    await new Promise(resolve => setTimeout(resolve, 1500))
    setJoined(true)
    
    setTimeout(() => {
      router.push('/')
    }, 1500)
  }

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">You're in! 🎉</h1>
          <p className="text-white/50">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center animate-scale-in">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-accent-500/25">
          <span className="text-2xl font-bold text-white">T</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          You've been invited!
        </h1>
        <p className="text-white/50 mb-6">
          Someone invited you to join their project on TeamSync
        </p>

        <div className="glass-card rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-3 text-white/70">
            <Users className="w-5 h-5" />
            <span>Invite Code: <code className="text-accent-400">{inviteCode}</code></span>
          </div>
        </div>

        <button
          onClick={handleJoin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white font-medium hover:from-accent-600 hover:to-accent-700 transition-all disabled:opacity-50"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Join Project
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-white/30 text-sm mt-4">
          Don't have an account? You'll create one after joining.
        </p>
      </div>
    </div>
  )
}
