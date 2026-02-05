
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('Missing NEXT_PUBLIC_SUPABASE_URL')
}

console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Loaded ✅' : 'Missing ❌');
console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Loaded ✅' : 'Missing ❌');

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const isConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL
