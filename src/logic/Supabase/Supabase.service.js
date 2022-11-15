import {createClient} from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export const fetchSnapshots = async () => {
    let {data, error, status} = await SupabaseClient
        .from('snapshot')
        .select();

    if (error && status !== 406) {
        throw error
    }

    return data;
};

export const uploadSnapshot = async (data) => {
    try {
        const result = await SupabaseClient
            .from('snapshot')
            .insert(data);
    } catch (e) {
        console.log('Upload Snapshot error: ', e.message);
    }
};

export const uploadSwaps = async (data) => {
    try {
        const result = await SupabaseClient
            .from('swap')
            .insert(data);
    } catch (e) {
        console.log('Upload Swaps error: ', e.message);
    }
};

export const uploadLogs = async (data) => {
    try {
        const result = await SupabaseClient
            .from('log')
            .insert(data);
    } catch (e) {
        console.log('Upload Logs error: ', e.message);
    }
};
