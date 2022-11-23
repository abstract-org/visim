import { createClient } from '@supabase/supabase-js'

export const TABLE = {
    quest: 'quest',
    investor: 'investor',
    investor_balances: 'investor_balances',
    pool: 'pool',
    pool_data: 'pool_data',
    position: 'position',
    snapshot_investor: 'snapshot_investor',
    snapshot_quest: 'snapshot_quest',
    snapshot_pool: 'snapshot_pool',
    swap: 'swap',
    log: 'log',
    snapshot_totals: 'snapshot_totals',
    snapshot: 'snapshot'
}

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)
