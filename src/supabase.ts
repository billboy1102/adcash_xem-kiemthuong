import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lmtcnbhdnryivjgupuct.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_madYCFjI2Iq7hEtauK8qOQ_0OaI4wld'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
