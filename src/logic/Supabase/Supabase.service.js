import { createClient } from '@supabase/supabase-js'
import HashMap from "hashmap";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
