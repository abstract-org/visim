import { LogicUtils } from '@abstract-org/sdk'
import { instanceToPlain } from 'class-transformer'
import HashMap from 'hashmap'

import { simSdk } from '../../sdk'
import { SupabaseClient, TABLE } from './SupabaseClient'
import {
    InvestorBalancesUploadDto,
    InvestorNavsUploadDto,
    LogUploadDto,
    PosOwnersUploadDto,
    PositionUploadDto,
    ScenarioDto,
    ScenarioInvestorConfigUploadDto,
    ScenarioQuestConfigUploadDto,
    SnapshotTotalsUploadDto,
    SnapshotUploadDto,
    SwapUploadDto
} from './dto'

/**
 * @description Saves aggregated positions and position owners to DB
 * @param {HashMap<Pool>} poolsMap
 * @param {HashMap<poolName: string, poolId: number>} poolMappings
 * @param {HashMap<hash: string, id: number>} investorMappings
 * @returns {Promise<null|boolean>}
 */
export const aggregatePositionsData = async (
    poolsMap,
    poolMappings,
    investorMappings
) => {
    try {
        let preparedPositions = []
        let preparedPosOwners = []

        poolsMap.values().forEach((pool) => {
            const poolId = poolMappings.get(pool.name)
            const poolPositions = pool.pos
                .values()
                .map((position) =>
                    new PositionUploadDto(position, poolId).toObj()
                )
            const poolPosOwners = pool.posOwners.map((posOwnerData) => {
                let investorId = investorMappings.get(posOwnerData.hash)

                return new PosOwnersUploadDto(
                    posOwnerData,
                    poolId,
                    investorId
                ).toObj()
            })

            preparedPosOwners.push(...poolPosOwners)
            preparedPositions.push(...poolPositions)
        })

        await Promise.all([
            SupabaseClient.from(TABLE.position).insert(preparedPositions),
            SupabaseClient.from(TABLE.position_owner).insert(preparedPosOwners)
        ])

        console.log('[Snapshot Generator] Positions/PosOwners inserted')

        return true
    } catch (e) {
        console.log('aggregatePositionData error: ', e.message)
        return null
    }
}

/**
 * @description
 * @param investorBalancesByDay - array of pairs [ day, investorDayBalances ]
 * @param investorHashToInvestorId
 * @param questNameToQuestId
 * @return {Promise<null>}
 */
export const aggregateInvestorBalancesWithDays = async (
    investorBalancesByDay,
    investorHashToInvestorId,
    questNameToQuestId
) => {
    try {
        const preparedInvestorBalances = []

        for (const [day, investorDayBalances] of investorBalancesByDay) {
            Object.entries(investorDayBalances).forEach(
                ([investorHash, balances]) => {
                    Object.entries(balances).forEach(([tokenName, balance]) => {
                        preparedInvestorBalances.push(
                            new InvestorBalancesUploadDto({
                                investor_id:
                                    investorHashToInvestorId.get(investorHash),
                                quest_id: questNameToQuestId.get(tokenName),
                                balance,
                                day
                            }).toObj()
                        )
                    })
                }
            )
        }

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
 * @description
 * @param investorNavsByDay - array of pairs [ day, investorNavsForDay ]
 * @param investorHashToInvestorId
 * @return {Promise<null>}
 */
export const aggregateInvestorNavs = async (
    investorNavsByDay,
    investorHashToInvestorId
) => {
    try {
        const preparedInvestorNavs = []

        for (const [day, invNavs] of investorNavsByDay) {
            Object.entries(invNavs).forEach(([hash, nav]) => {
                preparedInvestorNavs.push(
                    new InvestorNavsUploadDto({
                        investor_id: investorHashToInvestorId.get(hash),
                        usdc_nav: nav,
                        token_nav: nav,
                        day
                    })
                )
            })
        }

        await SupabaseClient.from(TABLE.investor_navs).insert(
            preparedInvestorNavs
        )

        console.log('[SupabaseService] aggregateInvestorNavs completed')
    } catch (e) {
        console.log('aggregateInvestorNavs error: ', e.message)
        return null
    }
}

export const aggregateScenarioData = async (
    scenarioName,
    investorConfigs,
    questConfigs
) => {
    try {
        const scenarioDbResponse = await SupabaseClient.from(TABLE.scenario)
            .insert(
                instanceToPlain(
                    new ScenarioDto({ name: `scenario-${scenarioName}` })
                )
            )
            .select('id')
            .limit(1)
            .single()

        if (scenarioDbResponse.data) {
            const scenarioId = scenarioDbResponse.data.id

            console.log(
                '[SupabaseService] aggregateScenarioData Scenario Created with ID: ',
                scenarioId
            )

            const preparedInvestorConfigs = investorConfigs.map((invConfig) =>
                instanceToPlain(
                    new ScenarioInvestorConfigUploadDto(invConfig, scenarioId)
                )
            )

            const preparedQuestConfigs = questConfigs.map((questConfig) =>
                instanceToPlain(
                    new ScenarioQuestConfigUploadDto(questConfig, scenarioId)
                )
            )

            await Promise.all([
                SupabaseClient.from(TABLE.scenario_investor_config).insert(
                    preparedInvestorConfigs
                ),
                SupabaseClient.from(TABLE.scenario_quest_config).insert(
                    preparedQuestConfigs
                )
            ])

            console.log(
                '[SupabaseService] aggregateScenarioData: Scenario inserted'
            )

            return scenarioId
        } else {
            return null
        }
    } catch (e) {
        console.log('aggregateScenarioData error: ', e.message)
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
    const preparedLogs = logsArray.map((log, idx) =>
        new LogUploadDto(log, poolMappings, investorMappings, idx).toObj()
    )

    await SupabaseClient.from(TABLE.log).insert(preparedLogs)

    console.log('[SupabaseService] aggregateLogsData completed')
}

/**
 * @description Saves snapshot to DB
 * @param {number} scenarioId
 * @param {string} seed
 * @param {string} creatorId
 * @param {number} currentDay
 * @returns {Promise<number>}
 */
export const createSnapshot = async ({
    scenarioId = 1,
    seed,
    creatorId,
    currentDay
}) => {
    const preparedSnapshot = new SnapshotUploadDto({
        seed,
        scenarioId,
        creatorId,
        currentDay
    }).toObj()
    const snapshotDbResponse = await SupabaseClient.from(TABLE.snapshot)
        .insert(preparedSnapshot)
        .select('id')
        .limit(1)
        .single()

    return snapshotDbResponse.data.id
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
    creatorId
}) => {
    try {
        console.time('[Snapshot Generator]')

        // Top Layer creation
        // Creating Snapshot to use ID for linking Layer 2 entities (investors, pools, quests)
        console.log('[Snapshot Generator] Launching Top Layer creation...')

        const scenarioId = await aggregateScenarioData(
            stateName,
            state.generatorStore.invConfigs,
            state.generatorStore.questConfigs
        )

        const snapshotDbId = await createSnapshot({
            scenarioId,
            creatorId,
            seed: stateName,
            currentDay: state.dayTrackerStore.currentDay
        })
        console.log(
            `[Snapshot Generator] Snapshot Created with id: ${snapshotDbId}`
        )

        // Layer 2 creation
        // Inserting Investors and Pools data with linking to snapshot by ID
        console.log('[Snapshot Generator] Launching Layer 2 creation...')

        await aggregateSnapshotTotals(snapshotDbId, state)

        const investorHashToInvestorId = await simSdk.saveInvestors(
            state.investors.values(),
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

        const questNameToQuestId = await simSdk.saveQuests(
            state.quests.values(),
            state.questStore.humanQuests,
            questNamesToInvestorIdMappings,
            snapshotDbId
        )

        const poolNameToPoolId = await simSdk.savePools(
            state.pools.values(),
            questNameToQuestId,
            snapshotDbId
        )

        // Layer 3 creation
        // Inserting data, related on Investors and Pools entities IDs
        console.log('[Snapshot Generator] Launching Layer 3 creation...')

        const investorNavsPartition = Object.entries(
            state.historical.investorNavs
        ).filter(([day]) => LogicUtils.inRangeFilter({ from: 0 })(day))

        const investorBalancesPartition = Object.entries(
            state.historical.investorBalances
        ).filter(([day]) => LogicUtils.inRangeFilter({ from: 0 })(day))

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
            ),
            aggregateInvestorBalancesWithDays(
                investorBalancesPartition,
                investorHashToInvestorId,
                questNameToQuestId
            ),
            aggregateInvestorNavs(
                investorNavsPartition,
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
