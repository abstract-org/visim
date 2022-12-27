import { SimSdk } from '@abstract-org/sdk'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const simSdk = SimSdk.init('sim', {
    dbUrl: supabaseUrl,
    accessToken: supabaseAnonKey
})
