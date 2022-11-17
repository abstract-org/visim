import { createClient } from '@supabase/supabase-js'
import HashMap from "hashmap";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 *
 * @param {("investor"|"quest"|"pool")} relationType
 * @param {Number} snapshotId
 * @param {Array<>} entities
 * @returns {Promise<void>}
 */
export const createSnapshotDataRelation = async (relationType, snapshotId, entities) => {
    try {
        const formattedSnapshotData = entities.map(({id}) => ({snapshot_id: snapshotId, entity_id: id}));

        switch (relationType) {
            case 'investor':
                return await SupabaseClient.from('snapshot_investor').insert(formattedSnapshotData);
            case 'quest':
                return await SupabaseClient.from('snapshot_quest').insert(formattedSnapshotData);
            case 'pool':
                return await SupabaseClient.from('snapshot_pool').insert(formattedSnapshotData);
        }
    } catch (e) {
        console.log('createSnapshotDataRelation error: ', e.message);
    }
};

/**
 *
 * @param poolsMap
 * @param poolId
 * @param ownerId
 * @returns {Promise<null|boolean>}
 */
export const aggregatePositionsData = async (poolsMap, poolId, ownerId) => {
    try {
        const poolNameToPositions = new HashMap();
        const positionOwners = [];

        poolsMap.forEach((poolValue, poolKey) => {
            poolValue.pos.forEach((positionValue) => {
                const currentPoolPositions = poolNameToPositions.get(poolValue.name);

                if (currentPoolPositions) {
                    poolNameToPositions.set(poolValue.name, [...currentPoolPositions, {
                        left: positionValue.left,
                        right: positionValue.right,
                        price_point: positionValue.pp,
                        crated_at: new Date()
                    }])
                } else {
                    poolNameToPositions.set(poolValue.name, [{
                        left: positionValue.left,
                        right: positionValue.right,
                        price_point: positionValue.pp,
                        crated_at: new Date()
                    }])
                }
            });

            poolValue.posOwners.forEach((posOwnerValue) => {
                // pool_id, investor_id
            });

        });

        return true;
    } catch (e) {
        console.log('aggregatePoolsData error: ', e.message);
        return null;
    }
};

/**
 *
 * @param poolsMap
 * @param snapshotId
 * @returns {Promise<null|*>}
 */
export const aggregatePoolsData = async (poolsMap, snapshotId) => {
    try {
        const poolNameToPoolId = new HashMap();

        const pools = [];
        const poolsData = [];

        poolsMap.forEach((poolValue, poolKey) => {
            const {name, hash, type, tokenLeft, tokenRight} = poolValue;

            pools.push({
                name,
                type,
                token0: tokenLeft,
                token1: tokenRight,
                hash: hash || 'hash',
                created_at: new Date()
            });

            poolsData.push({
                current_liquidity: poolValue.curLiq,
                current_price: poolValue.curPrice,
                current_price_point_lg2: poolValue.curPP,
                current_left_lg2: poolValue.curLeft,
                current_right_lg2: poolValue.curRight,
                token0_price: poolValue.priceToken0,
                token1_price: poolValue.priceToken1,
                volume_token0: poolValue.volumeToken0,
                volume_token1: poolValue.volumeToken1,
                tvl: 0,
                mcap: 0,
                created_at: new Date()
            });

        });

        const poolDbResponse = await SupabaseClient.from('pool')
            .insert(pools)
            .select('id, name');

        console.log('[Snapshot Generator] Pools inserted')

        if (poolDbResponse.data) {
            poolDbResponse.data.forEach((poolDb, poolDbIndex) => {
                poolNameToPoolId.set(poolDb.name, poolDb.id);
                poolsData[poolDbIndex].pool_id = poolDb.id;
            })
        }

        await Promise.all([
            await createSnapshotDataRelation("pool", snapshotId, poolDbResponse.data),
            await SupabaseClient.from('pool_data').insert(poolsData)
        ]);

        return poolNameToPoolId;
    } catch (e) {
        console.log('aggregatePoolsData error: ', e.message);
        return null;
    }
};

/**
 *
 * @param investorsMap
 * @param snapshotId
 * @returns {Promise<null|*>}
 */
export const aggregateInvestorsData = async (investorsMap, snapshotId) => {
    try {
        const investorHashToInvestorId = new HashMap();

        // Aggregating investors data from store
        const investors = [];

        investorsMap.forEach((poolValue, poolKey) => {
            const {name, hash, type, tokenLeft, tokenRight} = poolValue;

            investors.push({
                name,
                hash,
                type,
                created_at: new Date()
            });
        });

        // Inserting data to DB
        const investorDbResponse = await SupabaseClient.from('investor')
            .insert(investors)
            .select('id, hash');

        // Creating relation with Snapshot
        await createSnapshotDataRelation("investor", snapshotId, investorDbResponse.data);

        console.log('[SupabaseService] aggregateInvestorsData: Investors inserted')

        // Storing inserted entities IDs into HashMap for further linking
        if (investorDbResponse.data) {
            investorDbResponse.data.forEach(investorDb => {
                investorHashToInvestorId.set(investorDb.hash, investorDb.id);
            })
        }

        return investorHashToInvestorId;
    } catch (e) {
        console.log('aggregateInvestorsData error: ', e.message);
        return null;
    }
};

/**
 *
 * @param {Array} swapsArray
 * @param {HashMap} poolNameToPoolId
 * @param {HashMap} investorHashToInvestorId
 * @returns {Promise<void>}
 */
export const aggregateSwapsData = async (swapsArray, poolNameToPoolId, investorHashToInvestorId) => {
    const swaps = swapsArray.map(swap => {
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

    console.log('[SupabaseService] aggregateSwapsData completed')
};

/**
 *
 * @param {Array} logsArray
 * @param {HashMap} poolNameToPoolId
 * @param {HashMap} investorHashToInvestorId
 * @returns {Promise<void>}
 */
export const aggregateLogsData = async (logsArray, poolNameToPoolId, investorHashToInvestorId) => {
    const logs = logsArray.map(log => {
        return {
            pool_id: poolNameToPoolId.get(log.pool),
            investor_id: investorHashToInvestorId.get(log.investorHash),
            action: log.action,
        };
    })

    await SupabaseClient.from('log').insert(logs);

    console.log('[SupabaseService] aggregateLogsData completed')
};

/**
 *
 * @param scenarioId
 * @param seed
 * @returns {Promise<*>}
 */
export const createSnapshot = async ({scenarioId = 1, seed}) => {
    const snapshot = {
        seed,
        scenario_id: scenarioId,
        created_at: new Date()
    };
    const snapshotDbResponse = await SupabaseClient.from('snapshot').insert(snapshot).select('id')

    return snapshotDbResponse.data[0].id;
};

export const aggregateAndStoreDataForSnapshot = async ({state, stateName, stateId, scenarioId}) => {
    try {
        console.time('[Snapshot Generator]');

        // Top Layer creation
        // Creating Snapshot to use ID for linking Layer 2 entities (investors, pools, quests)
        console.log('[Snapshot Generator] Launching Top Layer creation...');
        const snapshotDbId = await createSnapshot({scenarioId, seed: stateName})
        console.log(`[Snapshot Generator] Snapshot Created with id: ${snapshotDbId}`);

        // Layer 2 creation
        // Inserting Investors and Pools data with linking to snapshot by ID
        console.log('[Snapshot Generator] Launching Layer 2 creation...');
        const [investorHashToInvestorId, poolNameToPoolId] = await Promise.all([
            await aggregateInvestorsData(state.investors, snapshotDbId),
            await aggregatePoolsData(state.pools, snapshotDbId)
        ]);

        // Layer 3 creation
        // Inserting data, related on Investors and Pools entities IDs
        console.log('[Snapshot Generator] Launching Layer 3 creation...');
        await Promise.all([
            aggregateSwapsData(state.poolStore.swaps, poolNameToPoolId, investorHashToInvestorId),
            aggregateLogsData(state.logStore.logObjs, poolNameToPoolId, investorHashToInvestorId)
        ])

        console.timeEnd('[Snapshot Generator]');

        return true;
    } catch (e) {
        console.error(`[Snapshot Generator] Error: ${e.message}`);
        console.timeEnd('[Snapshot Generator]');

        return false;
    }
};