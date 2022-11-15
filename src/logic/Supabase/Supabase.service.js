import {createClient} from '@supabase/supabase-js'
import globalState from "../GlobalState";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export const aggregateDataForSnapshot = (globalState) => {
    const currentDate = new Date();

    const investors = globalState.investorStore.investors.map(investorAddress => {
        const {name, hash, type} = globalState.investors.get(investorAddress);

        return {
            name,
            hash,
            type,
            createdAt: currentDate
        };
    });

    const pools = globalState.poolStore.pools.map(poolName => {
        const {name, hash, type, tokenLeft, tokenRight} = globalState.pools.get(poolName);

        return {
            name,
            hash,
            type,
            tokenO: tokenLeft,
            token1: tokenRight,
            createdAt: currentDate
        };
    });
};

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
