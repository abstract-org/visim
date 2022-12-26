import { Modules } from '@abstract-org/sdk'
import { faker } from '@faker-js/faker'
import HashMap from 'hashmap'

import globalState from '../GlobalState'
import Serializer from '../utils/serializer.js'
import { fromBase64 } from '../utils/uiUtils'
import { DEFAULT_SCHEMA } from './validation'

/**
 /**
 * @description Aggregates pools data to show totals
 * @param {stateId, stateName, scenarioId, state} snapshot
 * @returns {{}|{totalCrossPools, totalTVL: string, totalQuests, stateName: string, totalUSDC: string, stateId: (string|*), executionDate: string, totalMCAP: string, scenarioId: (number|*), totalInvestors}}
 */
export const aggregateSnapshotTotals = (snapshot) => {
    if (!snapshot) return {}

    const nf = new Intl.NumberFormat('en-US')

    let marketCap = 0
    let totalValueLocked = 0
    let totalUSDCLocked = 0

    const { stateId, stateName, state, scenarioId } = snapshot

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
        stateId,
        stateName: stateName || `${faker.word.noun()}`,
        scenarioId,
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
        const hydratedItem = Serializer.rehydrate(item, Modules.Pool)

        pools.set(key, hydratedItem)
    })

    quests.keys().forEach((key) => {
        const item = quests.get(key)
        const hydratedItem =
            item.$class === 'UsdcToken'
                ? Serializer.rehydrate(item, Modules.UsdcToken)
                : Serializer.rehydrate(item, Modules.Quest)

        quests.set(key, hydratedItem)
    })

    investors.keys().forEach((key) => {
        const item = investors.get(key)
        const hydratedItem = Serializer.rehydrate(item, Modules.Investor)

        investors.set(key, hydratedItem)
    })

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
    globalState.dayTrackerStore = state.dayTrackerStore
}

export const base64ToState = (base64st) => {
    const deserializedState = Serializer.deserialize(fromBase64(base64st))

    return rehydrateState(deserializedState)
}

const sanitizeInvestorStoreInvestors = (investorHashes) =>
    investorHashes.filter((hash) => typeof hash === 'string')

export const sanitizeSnapshot = (snapshot) => {
    snapshot.investorStore.investors = sanitizeInvestorStoreInvestors(
        snapshot.investorStore.investors
    )

    return snapshot
}

export const validateState = (
    state,
    schema = DEFAULT_SCHEMA,
    options = { convert: false, abortEarly: false }
) => {
    const validationResult = schema.validate(state, options)
    const { error } = validationResult
    console.debug(
        'Validation errors',
        JSON.parse(JSON.stringify(validationResult.error))
    )
    const isValid = !!error

    return { isValid, error }
}
