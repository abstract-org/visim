import HashMap from 'hashmap'

import Investor from '../logic/Investor/Investor.class'
import Router from '../logic/Router/Router.class'
import { prepareCrossPools } from './helpers/poolManager'

let globalState = {
    pools: new HashMap(),
    investors: new HashMap(),
    quests: new HashMap()
}

beforeAll(() => {})

afterEach(() => {
    globalState = {
        pools: new HashMap(),
        investors: new HashMap(),
        quests: new HashMap()
    }
})

it('Graphs single pool properly', () => {
    const creator = new Investor(1, 10000, 'creator')
    const router = new Router(globalState)

    const questA = creator.createQuest('TEST_1')
    const poolA = questA.createPool() // Deposit A
    globalState.quests.set(poolA.tokenLeft.name, poolA.tokenLeft)
    globalState.quests.set(questA.name, questA)
    globalState.pools.set(poolA.name, poolA)

    const poolsList = router.findPoolsFor('TEST_1')
    const graph = router.graphPools(poolsList)

    expect(poolsList[0].tokenLeft).toBe('USDC')
    expect(poolsList[0].tokenRight).toBe('TEST_1')

    expect(graph.adjList.has('USDC')).toBe(true)
    expect(graph.adjList.has('TEST_1')).toBe(true)
})

it('Chunks normal amounts', () => {
    const router = new Router()

    const chunks = router.chunkAmountBy(100, 38)
    expect(chunks.length).toBe(3)
    expect(chunks[0]).toBe(38)
    expect(chunks[chunks.length - 1]).toBe(24)
})

it('Chunks amounts below chunk size', () => {
    const router = new Router()

    const chunks = router.chunkAmountBy(30, 38)
    expect(chunks[0]).toBe(30)
})

fit('Smart route with amount based on liquidity', () => {
    const creator = new Investor(1, 10000, 'creator')
    const router = new Router(globalState)

    const questA = creator.createQuest('TEST_1')
    const poolA = questA.createPool() // Deposit A
    globalState.quests.set(poolA.tokenLeft.name, poolA.tokenLeft)
    globalState.quests.set(questA.name, questA)
    globalState.pools.set(poolA.name, poolA)

    const questB = creator.createQuest('TEST_2')
    const poolB = questB.createPool() // Deposit B
    //globalState.quests.set(poolB.tokenLeft.name, poolB.tokenLeft)
    globalState.quests.set(questB.name, questB)
    globalState.pools.set(poolB.name, poolB)

    const results1 = router.smartSwap('USDC', 'TEST_1', 500, 10)
    const results2 = router.smartSwap('USDC', 'TEST_2', 50, 5)

    expect(results1[0]).toBeCloseTo(-500)
    expect(results1[1]).toBeCloseTo(454.959)
    expect(results2.length).toBeLessThanOrEqual(0) // pool wasn't added to global state
})

it('Swaps USDC for D through a long chain with enough token supply', () => {
    const router = new Router(globalState)
    const defaultTokenASum = 100
    const [quests, pools] = prepareCrossPools(defaultTokenASum)

    for (const pool of Object.keys(pools)) {
        globalState.pools.set(pools[pool].name, pools[pool])
    }

    for (const quest of quests) {
        globalState.quests.set(quest.name, quest)
    }

    // Deposit USDC in all USDC pools
    pools.poolA.buy(1000) // Buy Token A
    pools.poolB.buy(1000) // Buy Token B
    pools.poolC.buy(1000) // Buy Token C
    pools.poolD.buy(1000) // Buy Token D
    pools.poolE.buy(1000) // Buy Token E

    // Deposit Tokens in Cross Pools
    pools.AB.buy(20) // Buy B by selling A
    pools.CA.buy(50) /// Buy A by selling C
    pools.CB.buy(60) // Buy B by selling C
    pools.CE.buy(80) /// Buy E by selling C
    pools.AD.buy(100) // Buy D by selling A
    pools.DC.buy(93) // Buy C by selling D
    pools.DE.buy(77) // Buy E by selling D
    pools.EB.buy(44) /// Buy B by selling E

    const res1 = router.smartSwap('USDC', 'AGORA_D', 25000, 10)

    expect(res1[0]).toBeCloseTo(-25000)
    expect(res1[1]).toBeCloseTo(3998.915)
})

it('Swaps USDC for D through a long chain with different crosspool supplies', () => {
    const router = new Router(globalState)
    const defaultTokenASum = 100
    const [quests, pools] = prepareCrossPools(defaultTokenASum)

    for (const pool of Object.keys(pools)) {
        globalState.pools.set(pools[pool].name, pools[pool])
    }

    for (const quest of quests) {
        globalState.quests.set(quest.name, quest)
    }

    // Deposit USDC in all USDC pools
    pools.poolA.buy(1000) // Buy Token A
    pools.poolB.buy(1000) // Buy Token B
    pools.poolC.buy(1000) // Buy Token C
    pools.poolD.buy(1000) // Buy Token D
    pools.poolE.buy(1000) // Buy Token E

    const res1 = router.smartSwap('USDC', 'AGORA_D', 25000, 10)

    expect(res1[0]).toBeCloseTo(-25000)
    expect(res1[1]).toBeCloseTo(4012.552)
})

it('Swaps USDC for D through a long chain with amount below chunk size', () => {
    const router = new Router(globalState)
    const defaultTokenASum = 100
    const [quests, pools] = prepareCrossPools(defaultTokenASum)

    for (const pool of Object.keys(pools)) {
        globalState.pools.set(pools[pool].name, pools[pool])
    }

    for (const quest of quests) {
        globalState.quests.set(quest.name, quest)
    }

    // Deposit USDC in all USDC pools
    pools.poolA.buy(1000) // Buy Token A
    pools.poolB.buy(1000) // Buy Token B
    pools.poolC.buy(1000) // Buy Token C
    pools.poolD.buy(1000) // Buy Token D
    pools.poolE.buy(1000) // Buy Token E

    const res1 = router.smartSwap('USDC', 'AGORA_D', 5, 10)

    expect(res1[0]).toBeCloseTo(-5)
    expect(res1[1]).toBeCloseTo(3.48)
})

it('Smart route with one citation selling USDC/TEST1', () => {
    const priceMin = 1
    const priceMax = 10
    const citeAmount = 27

    const creator = new Investor(1, 10000, 'creator')
    const router = new Router(globalState)

    const questA = creator.createQuest('TEST_1')
    const poolA = questA.createPool() // Deposit A
    globalState.quests.set(poolA.tokenLeft.name, poolA.tokenLeft)
    globalState.quests.set(questA.name, questA)
    globalState.pools.set(poolA.name, poolA)

    const questB = creator.createQuest('TEST_2')
    const poolB = questB.createPool() // Deposit B
    const exPool = globalState.quests.get(poolA.tokenLeft.name)
    exPool.addPool(poolB)
    globalState.quests.set(poolA.tokenLeft.name, exPool)
    globalState.quests.set(questB.name, questB)
    globalState.pools.set(poolB.name, poolB)

    const res1 = router.smartSwap('USDC', 'TEST_1', 555)
    const res2 = router.smartSwap('TEST_1', 'USDC', 50)

    // [TEST 2, TEST 1] (cited/citing)
    const AB = creator.createPool(questB, questA)
    creator.citeQuest(AB, priceMin, priceMax, citeAmount, 0)
    globalState.pools.set(AB.name, AB)
    const res3 = router.smartSwap('TEST_1', 'USDC', 50)
    expect(res1[0]).toBeCloseTo(-555)
    expect(res1[1]).toBeCloseTo(500.049)

    expect(res2[0]).toBeCloseTo(-50)
    expect(res2[1]).toBeCloseTo(60.923)

    expect(res3[0]).toBeCloseTo(-50)
    expect(res3[1]).toBeCloseTo(59.613)
})

it('Smart route with USDC buying from new pool', () => {
    const creator = new Investor(1, 10000, 'creator')
    const router = new Router(globalState)

    const questA = creator.createQuest('TEST_1')
    const poolA = questA.createPool() // Deposit A
    globalState.quests.set(poolA.tokenLeft.name, poolA.tokenLeft)
    globalState.quests.set(questA.name, questA)
    globalState.pools.set(poolA.name, poolA)

    const questB = creator.createQuest('TEST_2')
    const poolB = questB.createPool() // Deposit B
    //globalState.quests.set(poolB.tokenLeft.name, poolB.tokenLeft)
    globalState.quests.set(questB.name, questB)
    globalState.pools.set(poolB.name, poolB)

    const results1 = router.smartSwap('USDC', 'TEST_1', 500, 10)
    const results2 = router.smartSwap('USDC', 'TEST_2', 50, 5)

    expect(results1[0]).toBeCloseTo(-500)
    expect(results1[1]).toBeCloseTo(454.959)
    expect(results2.length).toBeLessThanOrEqual(0) // pool wasn't added to global state
})

it('Smart route with USDC buying citing', () => {
    const priceMin = 1
    const priceMax = 10
    const amount = 100
    const citeAmount = 25

    const creator = new Investor(1, 10000, 'creator')
    const router = new Router(globalState)

    const questA = creator.createQuest('TEST_1')
    const poolA = questA.createPool() // Deposit A
    globalState.quests.set(poolA.tokenLeft.name, poolA.tokenLeft)
    globalState.quests.set(questA.name, questA)
    globalState.pools.set(poolA.name, poolA)

    const questB = creator.createQuest('TEST_2')
    const poolB = questB.createPool() // Deposit B
    const exPool = globalState.quests.get(poolA.tokenLeft.name)
    exPool.addPool(poolB)
    globalState.quests.set(poolA.tokenLeft.name, exPool)
    globalState.quests.set(questB.name, questB)
    globalState.pools.set(poolB.name, poolB)
    poolB.buy(555) // Buy TEST_2 (around 500)

    // [TEST 1, TEST 2] (cited/citing)
    const AB = creator.createPool(questB, questA)
    creator.citeQuest(AB, priceMin, priceMax, citeAmount, 0)
    globalState.pools.set(AB.name, AB)
    AB.buy(25)

    const results = router.smartSwap('USDC', 'TEST_1', amount, 5)

    expect(results[0]).toBeCloseTo(-100)
    expect(results[1]).toBeCloseTo(98.058)
})

it('Smart route with USDC buying cited', () => {
    const priceMin = 1
    const priceMax = 10
    const amount = 100
    const citeAmount = 25

    const creator = new Investor(1, 10000, 'creator')
    const router = new Router(globalState)

    const questA = creator.createQuest('TEST_1')
    const poolA = questA.createPool() // Deposit A
    globalState.quests.set(poolA.tokenLeft.name, poolA.tokenLeft)
    globalState.quests.set(questA.name, questA)
    globalState.pools.set(poolA.name, poolA)

    const questB = creator.createQuest('TEST_2')
    const poolB = questB.createPool() // Deposit B
    const exPool = globalState.quests.get(poolA.tokenLeft.name)
    exPool.addPool(poolB)
    globalState.quests.set(poolA.tokenLeft.name, exPool)
    globalState.quests.set(questB.name, questB)
    globalState.pools.set(poolB.name, poolB)
    poolB.buy(555) // Buy TEST_2 (around 500)

    // [TEST 1, TEST 2] (cited/citing)
    const AB = creator.createPool(questB, questA)
    creator.citeQuest(AB, priceMin, priceMax, citeAmount, 0)
    globalState.pools.set(AB.name, AB)
    AB.buy(25)

    const results = router.smartSwap('USDC', 'TEST_2', amount, 5)

    expect(results[0]).toBeCloseTo(-100)
    expect(results[1]).toBeCloseTo(92.97)
})

it('Smart route with USDC buying big sum with dirty router', () => {
    const creator = new Investor(1, 10000, 'creator')
    const router = new Router(globalState)

    const questA = creator.createQuest('TEST_1')
    const poolA = questA.createPool() // Deposit A
    globalState.quests.set(poolA.tokenLeft.name, poolA.tokenLeft)
    globalState.quests.set(questA.name, questA)
    globalState.pools.set(poolA.name, poolA)

    const questB = creator.createQuest('TEST_2')
    const poolB = questB.createPool() // Deposit B
    const exPool = globalState.quests.get(poolA.tokenLeft.name)
    exPool.addPool(poolB)
    globalState.quests.set(poolA.tokenLeft.name, exPool)
    globalState.quests.set(questB.name, questB)
    globalState.pools.set(poolB.name, poolB)

    //const res1 = router.smartSwap('USDC', 'TEST_1', 5000, 10)
    //router.smartSwap('USDC', 'TEST_2', 5000)

    const AB = creator.createPool(questB, questA)
    creator.citeQuest(AB, 1, 10, 1005, 0)
    globalState.pools.set(AB.name, AB)

    const res3 = router.smartSwap('USDC', 'TEST_1', 1000000, 1000000 / 20, true)
    const res4 = router.smartSwap('TEST_2', 'USDC', 1000000, 1000000 / 10, true)

    /*expect(res1[0]).toBeCloseTo(-5000)
    expect(res1[1]).toBeCloseTo(2512.562)

    expect(res3[0]).toBeCloseTo(-1000000)
    expect(res3[1]).toBeCloseTo(10849.689)

    expect(res4[0]).toBeCloseTo(-5690.651) // @TODO: High difference after fix, check again
    expect(res4[1]).toBeCloseTo(281792.806)*/
})

it('Smart route for token through cited cross pool', () => {
    const creator = new Investor(1, 10000, 'creator')
    const router = new Router(globalState)

    const questA = creator.createQuest('TEST')
    const poolA = questA.createPool() // Deposit A
    globalState.quests.set(poolA.tokenLeft.name, poolA.tokenLeft)
    globalState.quests.set(questA.name, questA)
    globalState.pools.set(poolA.name, poolA)
    poolA.buy(5000)

    const questB = creator.createQuest('AGORA')
    const poolB = questB.createPool() // Deposit B
    const exPool = globalState.quests.get(poolA.tokenLeft.name)
    exPool.addPool(poolB)
    globalState.quests.set(poolA.tokenLeft.name, exPool)
    globalState.quests.set(questB.name, questB)
    globalState.pools.set(poolB.name, poolB)

    const AB = creator.createPool(questB, questA)
    const priceRange = creator.calculatePriceRange(poolA, poolB, 2)
    creator.citeQuest(AB, priceRange.min, priceRange.max, 1005, 0)
    globalState.pools.set(AB.name, AB)

    const res3 = router.smartSwap('USDC', 'TEST', 2000, 10)

    expect(res3[0]).toBeCloseTo(-2000)
    expect(res3[1]).toBeCloseTo(1355.421)
})

it('Smart route for token through cited cross pool with multiple smart swaps', () => {
    const creator = new Investor(1, 10000, 'creator')
    const router = new Router(globalState)

    const questA = creator.createQuest('TEST')
    const poolA = questA.createPool() // Deposit A
    globalState.quests.set(poolA.tokenLeft.name, poolA.tokenLeft)
    globalState.quests.set(questA.name, questA)
    globalState.pools.set(poolA.name, poolA)
    poolA.buy(5000)

    const questB = creator.createQuest('AGORA')
    const poolB = questB.createPool() // Deposit B
    const exPool = globalState.quests.get(poolA.tokenLeft.name)
    exPool.addPool(poolB)
    globalState.quests.set(poolA.tokenLeft.name, exPool)
    globalState.quests.set(questB.name, questB)
    globalState.pools.set(poolB.name, poolB)

    const AB = creator.createPool(questB, questA)
    const priceRange = creator.calculatePriceRange(poolA, poolB, 2)
    creator.citeQuest(AB, priceRange.min, priceRange.max, 1005, 0)
    globalState.pools.set(AB.name, AB)

    const res1 = router.smartSwap('USDC', 'TEST', 250, 10, true)
    expect(res1[0]).toBeCloseTo(-250)
    expect(res1[1]).toBeCloseTo(739.912)

    const res2 = router.smartSwap('USDC', 'TEST', 100, 10, true)
    expect(res2[0]).toBeCloseTo(-100)
    expect(res2[1]).toBeCloseTo(200.894)

    const res3 = router.smartSwap('USDC', 'TEST', 50, 10, true)
    const swapData = AB.getSwapInfo()
    expect(res3[0]).toBeCloseTo(-50)
    expect(res3[1]).toBeCloseTo(66.715) // @TODO: High output after fix, check again
    expect(swapData[1][1]).toBeCloseTo(358.901)

    const res4 = router.smartSwap('USDC', 'TEST', 650, 10, true)
    const res5 = router.smartSwap('USDC', 'TEST', 400, 10, true)
    const res6 = router.smartSwap('USDC', 'TEST', 400, 10, true)
    const res7 = router.smartSwap('USDC', 'TEST', 150, 10, true)

    const sumIn =
        res1[0] + res2[0] + res3[0] + res4[0] + res5[0] + res6[0] + res7[0]
    const sumOut =
        res1[1] + res2[1] + res3[1] + res4[1] + res5[1] + res6[1] + res7[1]

    expect(sumIn).toBeCloseTo(-2000)
    expect(sumOut).toBeCloseTo(1355.421)
    expect(poolA.currentPrice).toBeCloseTo(5.33)
    expect(poolB.currentPrice).toBeCloseTo(1.181)
    expect(AB.currentPrice).toBeCloseTo(999999.999)
    expect(AB.currentLiquidity).toBe(0)
})
