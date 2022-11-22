import HashMap from 'hashmap'

import { createHashMappings } from '../Utils/logicUtils'
import { SupabaseClient } from './SupabaseClient'
import {
    InvestorBalancesDto,
    InvestorUploadDto,
    LogUploadDto,
    PoolDataUploadDto,
    PoolUploadDto,
    PositionUploadDto,
    QuestUploadDto,
    SnapshotUploadDto,
    SwapUploadDto
} from './dto'

const RELATION_TYPE = {
    INVESTOR: 'investor',
    QUEST: 'quest',
    POOL: 'pool'
}

const TABLE = {
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
    snapshot: 'snapshot'
}

/**
 * @description Creates relation to snapshot for certain entity type
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
                return await SupabaseClient.from(
                    TABLE.snapshot_investor
                ).insert(formattedSnapshotData)
            case RELATION_TYPE.QUEST:
                return await SupabaseClient.from(TABLE.snapshot_quest).insert(
                    formattedSnapshotData
                )
            case RELATION_TYPE.POOL:
                return await SupabaseClient.from(TABLE.snapshot_pool).insert(
                    formattedSnapshotData
                )
            default:
                break
        }
    } catch (e) {
        console.log(
            `createSnapshotDataRelation error (relation ${relationType}): `,
            e.message
        )
    }
}

/**
 * @description Saves aggregated positions and position owners to DB
 * @param {HashMap<Pool>} poolsMap
 * @param {HashMap<poolName: string, poolId: number>} poolMappings
 * @returns {Promise<null|boolean>}
 */
export const aggregatePositionsData = async (poolsMap, poolMappings) => {
    try {
        let preparedPositions = []

        poolsMap.values().forEach((pool) => {
            const poolId = poolMappings.get(pool.name)
            const poolPositions = pool.pos
                .values()
                .map((position) =>
                    new PositionUploadDto(position, poolId).toObj()
                )
            preparedPositions.push(...poolPositions)
        })

        await SupabaseClient.from(TABLE.position).insert(preparedPositions)

        return true
    } catch (e) {
        console.log('aggregatePoolsData error: ', e.message)
        return null
    }
}

/**
 *
 * @param poolsMap
 * @param questNameToQuestId
 * @param snapshotId
 * @returns {Promise<null|*>}
 */
export const aggregatePoolsData = async (
    poolsMap,
    questNameToQuestId,
    snapshotId
) => {
    try {
        let poolNameToPoolId

        const pools = poolsMap
            .values()
            .map((poolValue) =>
                new PoolUploadDto(poolValue, questNameToQuestId).toObj()
            )

        const poolDbResponse = await SupabaseClient.from(TABLE.pool)
            .insert(pools)
            .select('id, name')

        console.log('[Snapshot Generator] Pools inserted')

        if (poolDbResponse.data) {
            poolNameToPoolId = createHashMappings(
                poolDbResponse.data,
                'name',
                'id'
            )
        }

        const preparedPoolDataList = poolsMap
            .values()
            .map((pool) =>
                new PoolDataUploadDto(pool, poolNameToPoolId).toObj()
            )

        await Promise.all([
            await createSnapshotDataRelation(
                'pool',
                snapshotId,
                poolDbResponse.data
            ),
            await SupabaseClient.from(TABLE.pool_data).insert(
                preparedPoolDataList
            )
        ])

        return poolNameToPoolId
    } catch (e) {
        console.log('aggregatePoolsData error: ', e.message)
        return null
    }
}

/**
 * @description Saves aggregated investors balances to DB
 * @param investorsMap
 * @param investorHashToInvestorId
 * @param questNameToQuestId
 * @returns {Promise<void>}
 */
export const aggregateInvestorBalances = async (
    investorsMap,
    investorHashToInvestorId,
    questNameToQuestId
) => {
    try {
        const preparedInvestorBalances = []

        investorsMap.forEach((inv) => {
            for (const [questName, investorBalance] of Object.entries(
                inv.balances
            )) {
                preparedInvestorBalances.push(
                    new InvestorBalancesDto(
                        investorHashToInvestorId.get(inv.hash),
                        questNameToQuestId.get(questName),
                        investorBalance
                    ).toObj()
                )
            }
        })

        await SupabaseClient.from(TABLE.investor_balances).insert(
            preparedInvestorBalances
        )

        console.log('[SupabaseService] aggregateInvestorBalances completed')
    } catch (e) {
        console.log('aggregateInvestorBalances error: ', e.message)
        return null
    }
}

/**
 * @description Saves aggregated investors to DB
 * @param investorsMap
 * @param snapshotId
 * @returns {Promise<null|*>}
 */
export const aggregateInvestorsData = async (investorsMap, snapshotId) => {
    try {
        let investorHashToInvestorId

        const preparedInvestors = investorsMap
            .values()
            .map((inv) => new InvestorUploadDto(inv).toObj())

        const investorDbResponse = await SupabaseClient.from(TABLE.investor)
            .insert(preparedInvestors)
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
            investorHashToInvestorId = createHashMappings(
                investorDbResponse.data,
                'hash',
                'id'
            )
        }

        return investorHashToInvestorId
    } catch (e) {
        console.log('aggregateInvestorsData error: ', e.message)
        return null
    }
}

/**
 * @description Saves aggregated swaps to DB
 * @param {Array} swapsArray
 * @param {HashMap} poolMappings - HashMap<poolName, poolId>
 * @param {HashMap} investorMappings - HashMap<investorHash, investorId>
 * @returns {Promise<void>}
 */
export const aggregateSwapsData = async (
    swapsArray,
    poolMappings,
    investorMappings
) => {
    const preparedSwaps = swapsArray.map((swap) =>
        new SwapUploadDto(swap, poolMappings, investorMappings).toObj()
    )

    await SupabaseClient.from(TABLE.swap).insert(preparedSwaps)

    console.log('[SupabaseService] aggregateSwapsData completed')
}

/**
 * @description Saves aggregated logs to DB
 * @param {Array} logsArray
 * @param {HashMap} poolMappings - HashMap<poolName, poolId>
 * @param {HashMap} investorMappings - HashMap<investorHash, investorId>
 * @returns {Promise<void>}
 */
export const aggregateLogsData = async (
    logsArray,
    poolMappings,
    investorMappings
) => {
    const preparedLogs = logsArray.map((log) =>
        new LogUploadDto(log, poolMappings, investorMappings).toObj()
    )

    await SupabaseClient.from(TABLE.log).insert(preparedLogs)

    console.log('[SupabaseService] aggregateLogsData completed')
}

/**
 * @description Saves snapshot to DB
 * @param {number} scenarioId
 * @param {string} seed
 * @returns {Promise<number>}
 */
export const createSnapshot = async ({ scenarioId = 1, seed }) => {
    const preparedSnapshot = new SnapshotUploadDto({
        seed,
        scenarioId
    })
    const snapshotDbResponse = await SupabaseClient.from(TABLE.snapshot)
        .insert(preparedSnapshot)
        .select('id')

    return snapshotDbResponse.data[0].id
}

/**
 * @description Saves aggregated quests to DB
 * @param {HashMap<Quest>} quests
 * @param {HashMap<questName: string, investorId: number>} investorMappings - mapping(questName => investor_id)
 * @param {number} snapshotId
 * @returns {Promise<void>}
 */
export const aggregateQuestData = async (
    quests,
    investorMappings,
    snapshotId
) => {
    let questNameToQuestId
    const preparedQuests = quests
        .values()
        .map((quest) => new QuestUploadDto(quest, investorMappings).toObj())

    const questDbResponse = await SupabaseClient.from(TABLE.quest)
        .insert(preparedQuests)
        .select('id, name')

    await createSnapshotDataRelation('quest', snapshotId, questDbResponse.data)

    if (questDbResponse.data) {
        questNameToQuestId = createHashMappings(
            questDbResponse.data,
            'name',
            'id'
        )
    }

    console.log('[SupabaseService] aggregateQuests completed')

    return questNameToQuestId
}

export const aggregateAndStoreDataForSnapshot = async ({
    state,
    stateName,
    scenarioId
}) => {
    try {
        console.time('[Snapshot Generator]')

        // Top Layer creation
        // Creating Snapshot to use ID for linking Layer 2 entities (investors, pools, quests)
        console.log('[Snapshot Generator] Launching Top Layer creation...')
        // @TODO: scenarioId should be either currently loaded untouched scenario or new pre-saved one from curren invConfigs and questConfigs
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
        const investorHashToInvestorId = await aggregateInvestorsData(
            state.investors,
            snapshotDbId
        )

        const questNamesToInvestorIdMappings = new HashMap()
        state.investors.values().forEach((inv) => {
            inv.questsCreated.forEach((questName) =>
                questNamesToInvestorIdMappings.set(
                    questName,
                    investorHashToInvestorId.get(inv.hash)
                )
            )
        })

        const questNameToQuestId = await aggregateQuestData(
            state.quests,
            questNamesToInvestorIdMappings,
            snapshotDbId
        )

        const poolNameToPoolId = await aggregatePoolsData(
            state.pools,
            questNameToQuestId,
            snapshotDbId
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
            aggregatePositionsData(state.pools, poolNameToPoolId),
            aggregateInvestorBalances(
                state.investors,
                investorHashToInvestorId,
                questNameToQuestId
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
