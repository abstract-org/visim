import { faker } from '@faker-js/faker'
import HashMap from 'hashmap'

import globalState from '../GlobalState'
import Investor from '../Investor/Investor.class'
import Pool from '../Pool/Pool.class'
import Token from '../Quest/Token.class'
import { rehydrate } from '../Utils/serializer'

// TODO: must be reworked
export const aggregateSnapshotTotals = (snapshot) => {
    let marketCap = 0
    let totalValueLocked = 0
    let totalUSDCLocked = 0
    if (!snapshot) return {}

    // FIXME: ERROR HERE
    //  TypeError: this.pos.get is not a function
    //     at Pool.buy (Pool.class.js:345:1)
    // snapshot.state.pools.forEach((pool) => {
    //     if (pool.isQuest()) {
    //         marketCap += pool.getMarketCap()
    //         totalValueLocked += pool.getTVL()
    //         totalUSDCLocked += pool.getUSDCValue()
    //     }
    // })
    const stateQuests = snapshot.state.quests.length
    const stateCrossPools = snapshot.state.pools.filter(
        (p) => !p.isQuest()
    ).length

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

export const DEFAULT_AGGREGATED_STATES = new Array(3)
    .fill(null)
    .map((val, id) => ({
        stateId: `state_${id}`,
        scenarioId: faker.word.adjective(),
        totals: `${faker.random.numeric()} quests / ${faker.random.numeric()} crosspools`,
        totalTVL: 100000 + faker.random.numeric() * 300,
        totalMCAP: 50000 + faker.random.numeric() * 300,
        totalUSDC: 200000 + faker.random.numeric() * 300,
        executionDate: faker.date.recent(14).toDateString()
    }))

// TODO: rewrite because it is very simple check right now
export const isValidSnapshot = (snapshot) => {
    return (
        snapshot &&
        'scenarioId' in snapshot &&
        'stateId' in snapshot &&
        'pools' in snapshot.state &&
        'quests' in snapshot.state &&
        'investors' in snapshot.state
    )
}

export const isValidStateList = (stateList) => {
    return Array.isArray(stateList) && stateList.every(isValidSnapshot)
}

/**
 * @description Simply serializes state to json string
 * @param {{pools: Pool[], quests: Token[], investors: Investor[]}} globalState
 * @returns {string}
 */
export const serializeState = (globalState) => {
    return JSON.stringify({
        pools: globalState.pools.values(),
        quests: globalState.quests.values(),
        investors: globalState.investors.values()
    })
}

/**
 * @description Instantiates every object with corresponding class
 * @param {{pools: Object[], quests: Object[], investors: Object[] }} stateObj
 * @returns {{pools: Pool[], quests: Token[], investors: Investor[]}}
 */
export const rehydrateState = (stateObj) => {
    let stateHydrated
    try {
        stateHydrated = {
            pools: stateObj.pools.map((item) => rehydrate(item, Pool)),
            quests: stateObj.quests.map((item) => rehydrate(item, Token)),
            investors: stateObj.investors.map((item) =>
                rehydrate(item, Investor)
            )
        }

        console.log('### DEBUG rehydrateState() stateHydrated =', stateHydrated)
    } catch (err) {
        console.log(err)
    }

    return stateHydrated
}

/**
 * @description Recreates globalState
 * @param {Pool[]} pools
 * @param {Token[]} quests
 * @param {Investor[]} investors
 */
export const overrideStateBySnapshot = ({ pools, quests, investors }) => {
    const withNameAsKey = (item) => [item.name, item.val]
    globalState.pools = new HashMap(pools.map(withNameAsKey))
    globalState.quests = new HashMap(quests.map(withNameAsKey))
    globalState.investors = new HashMap(investors.map(withNameAsKey))
    // TODO: update zustand store
}
