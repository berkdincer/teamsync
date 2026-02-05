
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('Missing NEXT_PUBLIC_SUPABASE_URL')
}

console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Loaded ✅' : 'Missing ❌');
console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Loaded ✅' : 'Missing ❌');

// Custom fetch that completely ignores abort signals
const customFetch: typeof fetch = (input, init) => {
    // Create new options without the signal - this prevents AbortError
    const newInit: RequestInit = {
        ...init,
        signal: undefined  // Explicitly remove signal
    }
    return fetch(input, newInit)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        storageKey: 'teamsync-auth',
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
    global: {
        fetch: customFetch as any
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
})
export const isConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL
