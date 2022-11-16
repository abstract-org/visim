import { createClient } from '@supabase/supabase-js'
import HashMap from "hashmap";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export const aggregateAndStoreDataForSnapshot = async ({state, stateName, stateId, scenarioId}) => {
    try {
        const currentDate = new Date();
        const poolNameToPoolId = new HashMap();
        const investorHashToInvestorId = new HashMap();

        const snapshot = {
            seed: stateName,
            scenario_id: 1,
            created_at: currentDate
        };

        console.time('[Snapshot Generator]');

        const snapshotDbResponse = await SupabaseClient.from('snapshot').insert(snapshot).select('id')

        const snapshotDbId = snapshotDbResponse.data[0].id;

        console.log(`[Snapshot Generator] Snapshot Created with id: ${snapshotDbId}`);

        // Aggregating investors data from store
        const investors = state.investorStore.investors.map(investorAddress => {
            const {name, hash, type} = state.investors.get(investorAddress);

            return {
                name,
                hash,
                type,
                created_at: currentDate
            };
        });

        // Inserting data to DB
        const investorDbResponse = await SupabaseClient.from('investor')
            .insert(investors)
            .select('id, hash');

        console.log('[Snapshot Generator] Investors inserted')

        // Storing inserted entities IDs into HashMap for further linking
        if (investorDbResponse.data) {
            investorDbResponse.data.forEach(investorDb => {
                investorHashToInvestorId.set(investorDb.hash, investorDb.id);
            })
        }

        const pools = [];

        state.pools.forEach((poolValue, poolKey) => {
            const {name, hash, type, tokenLeft, tokenRight} = poolValue;

            pools.push({
                name,
                type,
                token0: tokenLeft,
                token1: tokenRight,
                hash: hash || 'hash',
                created_at: currentDate
            });
        });

        const poolDbResponse = await SupabaseClient.from('pool')
            .insert(pools)
            .select('id, name');

        console.log('[Snapshot Generator] Pools inserted')

        if (poolDbResponse.data) {
            poolDbResponse.data.forEach(poolDb => {
                poolNameToPoolId.set(poolDb.name, poolDb.id);
            })
        }

        // PosOwners, Positions

        const swaps = state.poolStore.swaps.map(swap => {
            return {
                pool_id: poolNameToPoolId.get(swap.pool),
                investor_id: investorHashToInvestorId.get(swap.investorHash),
                action: swap.action,
                amount_in: swap.totalAmountIn,
                amount_out: swap.totalAmountOut,
                day: swap.day,
                block: 0,
                path: swap.paths
            };
        });

        await SupabaseClient.from('swap').insert(swaps);

        console.log('[Snapshot Generator] Swaps inserted')

        const logs = state.logStore.logObjs.map(log => {
            return {
                pool_id: poolNameToPoolId.get(log.pool),
                investor_id: investorHashToInvestorId.get(log.investorHash),
                action: log.action,
            };
        })

        await SupabaseClient.from('log').insert(logs);

        console.log('[Snapshot Generator] Logs inserted')
        console.timeEnd('[Snapshot Generator]');

        return true;
    } catch (e) {
        console.error(`[Snapshot Generator] Error: ${e.message}`);
        console.timeEnd('[Snapshot Generator]');

        return false;
    }
};