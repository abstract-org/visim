import HashMap from 'hashmap'

import globalState from '../GlobalState'
import Investor from '../Investor/Investor.class'
import Pool from '../Pool/Pool.class'
import Token from '../Quest/Token.class'
import UsdcToken from '../Quest/UsdcToken.class'
import { fromBase64 } from '../Utils/logicUtils'
import Serializer from '../Utils/serializer.js'

/**
 * @description Aggregates pools data to show totals
 * @param {stateId, scenarioId, state} snapshot
 * @returns {{}|{totalTVL: number, totalUSDC: number, stateId: (string|*), executionDate: string, totalMCAP: number, totals: string, scenarioId: (string|number|*)}}
 */
export const aggregateSnapshotTotals = (snapshot) => {
    const nf = new Intl.NumberFormat('en-US')

    let marketCap = 0
    let totalValueLocked = 0
    let totalUSDCLocked = 0
    if (!snapshot) return {}
    const { state } = snapshot

    state.pools.values().forEach((pool) => {
        if (pool.isQuest()) {
            marketCap += pool.getMarketCap()
            totalValueLocked += pool.getTVL()
            totalUSDCLocked += pool.getUSDCValue()
        }
    })
    const stateQuests = state.quests.values().length
    const stateCrossPools = state.pools
        .values()
        .filter((p) => !p.isQuest()).length
    const stateInvestors = state.investors.values().length

    return {
        stateId: snapshot.stateId,
        scenarioId: snapshot.scenarioId,
        totalQuests: stateQuests,
        totalCrossPools: stateCrossPools,
        totalInvestors: stateInvestors,
        totalTVL: nf.format(totalValueLocked),
        totalMCAP: nf.format(marketCap),
        totalUSDC: nf.format(totalUSDCLocked),
        executionDate: new Date().toDateString() // TODO: find out where it comes from
    }
}

/**
 * @description Instantiates every object with corresponding class
 * @param {{pools: Object[], quests: Object[], investors: Object[] }} state
 * @returns {{pools: Object[], quests: Object[], investors: Object[]}}
 */
export const rehydrateState = (state) => {
    const { pools, quests, investors } = state

    pools.keys().forEach((key) => {
        const item = pools.get(key)
        const hydratedItem = Serializer.rehydrate(item, Pool)

        pools.set(key, hydratedItem)
    })

    quests.keys().forEach((key) => {
        const item = quests.get(key)
        const hydratedItem =
            item.$class === 'UsdcToken'
                ? Serializer.rehydrate(item, UsdcToken)
                : Serializer.rehydrate(item, Token)

        quests.set(key, hydratedItem)
    })

    investors.keys().forEach((key) => {
        const item = investors.get(key)
        const hydratedItem = Serializer.rehydrate(item, Investor)

        investors.set(key, hydratedItem)
    })

    // logs - array of plain objects - no need to rehydrate
    // questStore - object with primitive arrays - no need to rehydrate

    // TODO: extend rehydration for additional classes if needed

    return state
}

/**
 * @description Recreates globalState
 * @param {Object} state
 */
export const overrideStateBySnapshot = (state) => {
    globalState.pools = new HashMap(state.pools)
    globalState.quests = new HashMap(state.quests)
    globalState.investors = new HashMap(state.investors)
    globalState.logStore = state.logStore
    globalState.questStore = state.questStore
    globalState.poolStore = state.poolStore
    globalState.generatorStore = state.generatorStore
    globalState.investorStore = state.investorStore
}

export const base64ToState = (base64st) => {
    const deserializedState = Serializer.deserialize(fromBase64(base64st))

    return rehydrateState(deserializedState)
}