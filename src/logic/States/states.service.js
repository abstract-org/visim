import HashMap from 'hashmap'

import globalState from '../GlobalState'
import Investor from '../Investor/Investor.class'
import Pool from '../Pool/Pool.class'
import Token from '../Quest/Token.class'
import UsdcToken from '../Quest/UsdcToken.class'
import Serializer from '../Utils/serializer.js'

/**
 * @description Aggregates pools data to show totals
 * @param {stateId, scenarioId, state} snapshot
 * @returns {{}|{totalTVL: number, totalUSDC: number, stateId: (string|*), executionDate: string, totalMCAP: number, totals: string, scenarioId: (string|number|*)}}
 */
export const aggregateSnapshotTotals = (snapshot) => {
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

    return {
        stateId: snapshot.stateId,
        scenarioId: snapshot.scenarioId,
        totals: `${stateCrossPools} Pools / ${stateQuests} Quests`,
        totalTVL: totalValueLocked,
        totalMCAP: marketCap,
        totalUSDC: totalUSDCLocked,
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

    // TODO: extend rehydration for additional classes

    return { pools, quests, investors }
}

/**
 * @description Recreates globalState
 * @param {Object} state
 */
export const overrideStateBySnapshot = ({ state }) => {
    globalState.pools = new HashMap(state.pools)
    globalState.quests = new HashMap(state.quests)
    globalState.investors = new HashMap(state.investors)

    // TODO: update zustand store
}
