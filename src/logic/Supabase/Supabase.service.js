import { createClient } from '@supabase/supabase-js'
import HashMap from 'hashmap'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

const RELATION_TYPE = {
    INVESTOR: 'investor',
    QUEST: 'quest',
    POOL: 'pool'
}

export const SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

/**
 *
 * @param {("investor"|"quest"|"pool")} relationType
 * @param {Number} snapshotId
 * @param {Array<>} entities
 * @returns {Promise<void>}
 */
export const createSnapshotDataRelation = async (
    relationType,
    snapshotId,
    entities
) => {
    try {
        const formattedSnapshotData = entities.map(({ id }) => ({
            snapshot_id: snapshotId,
            entity_id: id
        }))

        switch (relationType) {
            case RELATION_TYPE.INVESTOR:
                return await SupabaseClient.from('snapshot_investor').insert(
                    formattedSnapshotData
                )
            case RELATION_TYPE.QUEST:
                return await SupabaseClient.from('snapshot_quest').insert(
                    formattedSnapshotData
                )
            case RELATION_TYPE.POOL:
                return await SupabaseClient.from('snapshot_pool').insert(
                    formattedSnapshotData
                )
        }
    } catch (e) {
        console.log('createSnapshotDataRelation error: ', e.message)
    }
}

export const aggregateScenariosData = async () => {}

export const aggregateQuestsData = async (
    questsMap,
    investorHashToInvestorId,
    investorHashToQuestsCreated
) => {
    try {
        const tokenNameToQuestId = new HashMap()
        const quests = []

        for (let { key, value } of investorHashToQuestsCreated) {
            value.forEach((questName) => {
                quests.push({
                    author_id: investorHashToInvestorId.get(key),
                    name: questName,
                    hash: questsMap.get(questName).hash
                })
            })
        }

        const questDbResponse = await SupabaseClient.from('quest')
            .insert(quests)
            .select('id, name')

        if (questDbResponse.data) {
            questDbResponse.data.forEach((questDb, questDbIndex) => {
                tokenNameToQuestId.set(questDb.name, questDb.id)
            })
        }

        return {}
    } catch (e) {
        console.log('aggregateQuestsData error: ', e.message)
    }
}

export const createPositionOwnerRelation = async (
    relationType,
    ownerId,
    entities
) => {
    try {
        const formattedPositionOwnerData = entities.map(({ id }) => ({
            owner_id: ownerId,
            owner_type: relationType,
            position_id: id,
            investor_id: null,
            quest_id: null,
            pool_id: null
        }))

        switch (relationType) {
            case RELATION_TYPE.INVESTOR:
                break
            case RELATION_TYPE.QUEST:
                break
            case RELATION_TYPE.POOL:
                break
        }
    } catch (e) {
        console.log('assignPositionOwner error: ', e.message)
    }
}

/**
 * @description aggregatePositionsData
 * @param poolsMap
 * @param {HashMap} poolNameToPoolId
 * @param {HashMap} investorHashToInvestorId
 * @returns {Promise<null|boolean>}
 */
export const aggregatePositionsData = async (
    poolsMap,
    poolNameToPoolId,
    investorHashToInvestorId
) => {
    try {
        const poolNameToPositions = new HashMap()
        const positionOwners = []

        poolsMap.forEach((poolValue, poolKey) => {
            poolValue.pos.forEach((positionValue) => {
                const currentPoolPositions = poolNameToPositions.get(
                    poolValue.name
                )

                if (currentPoolPositions) {
                    poolNameToPositions.set(poolValue.name, [
                        ...currentPoolPositions,
                        {
                            left: positionValue.left,
                            right: positionValue.right,
                            price_point: positionValue.pp,
                            crated_at: new Date()
                        }
                    ])
                } else {
                    poolNameToPositions.set(poolValue.name, [
                        {
                            left: positionValue.left,
                            right: positionValue.right,
                            price_point: positionValue.pp,
                            crated_at: new Date()
                        }
                    ])
                }
            })

            poolValue.posOwners.forEach((posOwnerValue) => {
                // pool_id, investor_id
            })
        })

        return true
    } catch (e) {
        console.log('aggregatePoolsData error: ', e.message)
        return null
    }
}

/**
 *
 * @param poolsMap
 * @param snapshotId
 * @param tokenNameToQuestId
 * @returns {Promise<null|*>}
 */
export const aggregatePoolsData = async (
    poolsMap,
    snapshotId,
    tokenNameToQuestId
) => {
    try {
        const poolNameToPoolId = new HashMap()

        const pools = []
        const poolsData = []

        poolsMap.forEach((poolValue, poolKey) => {
            const { name, hash, type, tokenLeft, tokenRight } = poolValue

            pools.push({
                name,
                type,
                token0: tokenNameToQuestId.get(tokenLeft),
                token1: tokenNameToQuestId.get(tokenRight),
                hash: hash || 'hash',
                created_at: new Date()
            })

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
            })
        })

        const poolDbResponse = await SupabaseClient.from('pool')
            .insert(pools)
            .select('id, name')

        console.log('[Snapshot Generator] Pools inserted')

        if (poolDbResponse.data) {
            poolDbResponse.data.forEach((poolDb, poolDbIndex) => {
                poolNameToPoolId.set(poolDb.name, poolDb.id)
                poolsData[poolDbIndex].pool_id = poolDb.id
            })
        }

        await Promise.all([
            await createSnapshotDataRelation(
                'pool',
                snapshotId,
                poolDbResponse.data
            ),
            await SupabaseClient.from('pool_data').insert(poolsData)
        ])

        return poolNameToPoolId
    } catch (e) {
        console.log('aggregatePoolsData error: ', e.message)
        return null
    }
}

/**
 *
 * @param investorsMap
 * @param snapshotId
 * @returns {Promise<null|*>}
 */
export const aggregateInvestorsData = async (investorsMap, snapshotId) => {
    try {
        const investorHashToInvestorId = new HashMap()
        const investorHashToQuestsCreated = new HashMap()

        // Aggregating investors data from store
        const investors = []

        investorsMap.forEach((investorValue, investorKey) => {
            const { name, hash, type, questsCreated } = investorValue

            if (questsCreated.length) {
                if (investorHashToQuestsCreated.has(hash)) {
                    const currentValue = investorHashToQuestsCreated.get(hash)
                    investorHashToQuestsCreated.set(hash, [
                        ...currentValue,
                        ...questsCreated
                    ])
                } else {
                    investorHashToQuestsCreated.set(hash, questsCreated)
                }
            }

            investors.push({
                name,
                hash,
                type,
                created_at: new Date()
            })
        })

        // Inserting data to DB
        const investorDbResponse = await SupabaseClient.from('investor')
            .insert(investors)
            .select('id, hash')

        // Creating relation with Snapshot
        await createSnapshotDataRelation(
            'investor',
            snapshotId,
            investorDbResponse.data
        )

        console.log(
            '[SupabaseService] aggregateInvestorsData: Investors inserted'
        )

        // Storing inserted entities IDs into HashMap for further linking
        if (investorDbResponse.data) {
            for (let investorDb of investorDbResponse.data) {
                investorHashToInvestorId.set(investorDb.hash, investorDb.id)
            }
        }

        return [investorHashToInvestorId, investorHashToQuestsCreated]
    } catch (e) {
        console.log('aggregateInvestorsData error: ', e.message)
        return null
    }
}

/**
 *
 * @param {Array} swapsArray
 * @param {HashMap} poolNameToPoolId
 * @param {HashMap} investorHashToInvestorId
 * @returns {Promise<void>}
 */
export const aggregateSwapsData = async (
    swapsArray,
    poolNameToPoolId,
    investorHashToInvestorId
) => {
    const swaps = swapsArray.map((swap) => {
        return {
            pool_id: poolNameToPoolId.get(swap.pool),
            investor_id: investorHashToInvestorId.get(swap.investorHash),
            action: swap.action,
            amount_in: swap.totalAmountIn,
            amount_out: swap.totalAmountOut,
            day: swap.day,
            block: 0,
            path: swap.paths
        }
    })

    await SupabaseClient.from('swap').insert(swaps)

    console.log('[SupabaseService] aggregateSwapsData completed')
}

/**
 *
 * @param {Array} logsArray
 * @param {HashMap} poolNameToPoolId
 * @param {HashMap} investorHashToInvestorId
 * @returns {Promise<void>}
 */
export const aggregateLogsData = async (
    logsArray,
    poolNameToPoolId,
    investorHashToInvestorId
) => {
    const logs = logsArray.map((log) => {
        return {
            pool_id: poolNameToPoolId.get(log.pool),
            investor_id: investorHashToInvestorId.get(log.investorHash),
            action: log.action
        }
    })

    await SupabaseClient.from('log').insert(logs)

    console.log('[SupabaseService] aggregateLogsData completed')
}

/**
 *
 * @param scenarioId
 * @param seed
 * @returns {Promise<*>}
 */
export const createSnapshot = async ({ scenarioId = 1, seed }) => {
    const snapshot = {
        seed,
        scenario_id: scenarioId,
        created_at: new Date()
    }
    const snapshotDbResponse = await SupabaseClient.from('snapshot')
        .insert(snapshot)
        .select('id')

    return snapshotDbResponse.data[0].id
}

export const aggregateAndStoreDataForSnapshot = async ({
    state,
    stateName,
    stateId,
    scenarioId
}) => {
    try {
        console.time('[Snapshot Generator]')

        // Top Layer creation
        // Creating Snapshot to use ID for linking Layer 2 entities (investors, pools, quests)
        console.log('[Snapshot Generator] Launching Top Layer creation...')
        const snapshotDbId = await createSnapshot({
            scenarioId,
            seed: stateName
        })
        console.log(
            `[Snapshot Generator] Snapshot Created with id: ${snapshotDbId}`
        )

        // Layer 2 creation
        // Inserting Investors and Pools data with linking to snapshot by ID
        console.log('[Snapshot Generator] Launching Layer 2 creation...')
        const [investorHashToInvestorId, investorHashToQuestsCreated] =
            await aggregateInvestorsData(state.investors, snapshotDbId)

        const tokenNameToQuestId = await aggregateQuestsData(
            state.quests,
            investorHashToInvestorId,
            investorHashToQuestsCreated
        )

        const poolNameToPoolId = await aggregatePoolsData(
            state.pools,
            snapshotDbId,
            tokenNameToQuestId
        )

        // Layer 3 creation
        // Inserting data, related on Investors and Pools entities IDs
        console.log('[Snapshot Generator] Launching Layer 3 creation...')
        await Promise.all([
            aggregateSwapsData(
                state.poolStore.swaps,
                poolNameToPoolId,
                investorHashToInvestorId
            ),
            aggregateLogsData(
                state.logStore.logObjs,
                poolNameToPoolId,
                investorHashToInvestorId
            ),
            aggregatePositionsData(
                state.pools,
                poolNameToPoolId,
                investorHashToInvestorId
            )
        ])

        console.timeEnd('[Snapshot Generator]')

        return true
    } catch (e) {
        console.error(`[Snapshot Generator] Error: ${e.message}`)
        console.timeEnd('[Snapshot Generator]')

        return false
    }
}
