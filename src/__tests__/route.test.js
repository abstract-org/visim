import HashMap from 'hashmap'
import Investor from '../logic/Investor/Investor.class'
import Router from '../logic/Router/Router.class'

import { faker } from '@faker-js/faker';


let state = {
    pools: new HashMap(),
    investors: new HashMap(),
    quests: new HashMap()
}

beforeAll(() => {
    const creator = new Investor(1, 10000, "creator")
    state.investors.set(creator.hash, creator)

    // Init USDC pools
    Array.from({ length: 4 }).forEach(() => {
        const quest = creator.createQuest(faker.name.firstName().toUpperCase())
        const pool = quest.createPool()
        
        quest.addPool(pool)
        quest.initializePoolPositions(pool)
        
        state.quests.set(quest.name, quest)
        state.pools.set(pool.name, pool)
    })

    // Create value links
    let pairs = state.quests.values().map( (v, i) => state.quests.values().slice(i + 1).map(w => [v, w]) ).flat()

    pairs.forEach(pair => {
        const valueLinkPool = pair[0].createPool(pair[1])
        const priceMin = 1
        const priceMax = 10

        // Open positions for tA<>tB
        let liquidity = valueLinkPool.getLiquidityForAmounts(
            1000,
            0,
            Math.sqrt(priceMin),
            Math.sqrt(priceMax),
            Math.sqrt(valueLinkPool.currentPrice)
        )

        valueLinkPool.setPositionSingle(priceMin, liquidity)
        valueLinkPool.setPositionSingle(priceMax, -liquidity)

        pair[0].addPool(valueLinkPool)
        pair[1].addPool(valueLinkPool)

        state.pools.set(valueLinkPool.name, valueLinkPool)
    })
})

afterAll(() => {
    state = {
        pools: new HashMap(),
        investors: new HashMap(),
        quests: new HashMap()
    }
})

it('Should find all pools containing tokenA', () => {
    const router = new Router(state)
    const toFindQuestName = state.quests.get( state.quests.keys()[0] ).name

    const pools = router.findTokenInPools(toFindQuestName)
    expect(pools.length).toBeGreaterThanOrEqual(1)
})

it('Should find route from tokenA to tokenB', () => {
    const tokenA = state.quests.values()[0]
    const tokenB = state.quests.get( state.quests.keys()[Math.floor(Math.random() * state.quests.count())] )
})

it('Should mark pools which have enough TVL to swap', () => {

})

