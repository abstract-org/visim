import { LogicUtils } from '@abstract-org/sdk'
import HashMap from 'hashmap'

import { simSdk } from '../../sdk'

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

        const scenarioId = await simSdk.saveScenario(
            stateName,
            state.generatorStore.invConfigs,
            state.generatorStore.questConfigs
        )

        const snapshotDbId = await simSdk.saveSnapshot({
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

        await simSdk.saveSnapshotTotals(snapshotDbId, {
            quests: state.quests.values(),
            pools: state.pools.values(),
            investors: state.investors.values()
        })

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
            simSdk.saveSwaps(
                state.poolStore.swaps,
                poolNameToPoolId,
                investorHashToInvestorId
            ),
            simSdk.saveLogs(
                state.logStore.logObjs,
                poolNameToPoolId,
                investorHashToInvestorId
            ),
            simSdk.savePositionsData(
                state.pools.values(),
                poolNameToPoolId,
                investorHashToInvestorId
            ),
            simSdk.saveInvestorBalances(
                investorBalancesPartition,
                investorHashToInvestorId,
                questNameToQuestId
            ),
            simSdk.saveInvestorNavs(
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

export const fetchTotalsList = async () => {
    return simSdk.fetchTotalsList()
}

export const fetchSnapshotById = async (id) => {
    return simSdk.fetchSnapshotById(id)
}
