import HashMap from 'hashmap'

import { createHashMappings } from '../Utils/logicUtils'
import { SupabaseClient, TABLE } from './SupabaseClient'
import {
    InvestorUploadDto,
    LogUploadDto,
    PoolDataUploadDto,
    PoolUploadDto,
    PositionUploadDto,
    QuestUploadDto,
    SnapshotTotalsUploadDto,
    SnapshotUploadDto,
    SwapUploadDto
} from './dto'

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
            case 'investor':
                return await SupabaseClient.from(
                    TABLE.snapshot_investor
                ).insert(formattedSnapshotData)
            case 'quest':
                return await SupabaseClient.from(TABLE.snapshot_quest).insert(
                    formattedSnapshotData
                )
            case 'pool':
                return await SupabaseClient.from(TABLE.snapshot_pool).insert(
                    formattedSnapshotData
                )
            default:
                break
        }
    } catch (e) {
        console.log('createSnapshotDataRelation error: ', e.message)
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
 * @param snapshotId
 * @returns {Promise<null|*>}
 */
export const aggregatePoolsData = async (poolsMap, snapshotId) => {
    try {
        let poolNameToPoolId

        const pools = poolsMap
            .values()
            .map((poolValue) => new PoolUploadDto(poolValue).toObj())

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
    const preparedQuests = quests
        .values()
        .map((quest) => new QuestUploadDto(quest, investorMappings).toObj())

    const questDbResponse = await SupabaseClient.from(TABLE.quest).insert(
        preparedQuests
    )
    await createSnapshotDataRelation('quest', snapshotId, questDbResponse.data)

    console.log('[SupabaseService] aggregateQuests completed')
}

/**
 * @description Saves aggregated totals for current snapshot
 * @param {number} snapshotId
 * @param {Object} state
 * @returns {Promise<void>}
 */
export const aggregateSnapshotTotals = async (snapshotId, state) => {
    let marketCap = 0
    let totalValueLocked = 0
    let totalUSDCLocked = 0
    state.pools.values().forEach((pool) => {
        if (pool.isQuest()) {
            marketCap += pool.getMarketCap()
            totalValueLocked += pool.getTVL()
            totalUSDCLocked += pool.getUSDCValue()
        }
    })

    const preparedTotals = new SnapshotTotalsUploadDto({
        snapshot_id: snapshotId,
        quests: state.quests.values().length,
        cross_pools: state.pools.values().filter((p) => !p.isQuest()).length,
        investors: state.investors.values().length,
        tvl: totalValueLocked,
        mcap: marketCap,
        usdc: totalUSDCLocked
    }).toObj()

    return SupabaseClient.from(TABLE.snapshot_totals).insert(preparedTotals)
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

        await aggregateSnapshotTotals(snapshotDbId, state)

        const [investorHashToInvestorId, poolNameToPoolId] = await Promise.all([
            await aggregateInvestorsData(state.investors, snapshotDbId),
            await aggregatePoolsData(state.pools, snapshotDbId)
        ])

        const questNamesToInvestorIdMappings = new HashMap()
        state.investors.values().forEach((inv) => {
            inv.questsCreated.forEach((questName) =>
                questNamesToInvestorIdMappings.set(
                    questName,
                    investorHashToInvestorId.get(inv.investorHash)
                )
            )
        })

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
            aggregateQuestData(
                state.quests,
                questNamesToInvestorIdMappings,
                snapshotDbId
            ),
            aggregatePositionsData(state.pools, poolNameToPoolId)
        ])

        console.timeEnd('[Snapshot Generator]')

        return true
    } catch (e) {
        console.error(`[Snapshot Generator] Error: ${e.message}`)
        console.timeEnd('[Snapshot Generator]')

        return false
    }
}
