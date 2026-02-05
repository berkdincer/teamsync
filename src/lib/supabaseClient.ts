
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('Missing NEXT_PUBLIC_SUPABASE_URL')
}

console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Loaded ✅' : 'Missing ❌');
console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Loaded ✅' : 'Missing ❌');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        storageKey: 'teamsync-auth',
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
    global: {
        fetch: async (url, options = {}) => {
            try {
                return await fetch(url, options)
            } catch (error: any) {
                // Log AbortError but still throw it so retry logic can work
                if (error?.name === 'AbortError') {
                    console.log('[Supabase] Request aborted')
                }
                throw error
            }
        }
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
})
export const isConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL
