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

it('Calculates routes to swap A for D', () => {
    const router = new Router(globalState)
    const mockInvestor1 = new Investor(1, 50000, 'long-term')
    const mockInvestor2 = new Investor(2, 1000, 'creator')
    mockInvestor2.addBalance('AGORA_A', 1000)

    const amount = 10
    const priceMin = 1
    const priceMax = 10
    const defaultTokenASum = 1000
    const totalAmount = 1000

    const [quests, pools] = prepareCrossPools(
        priceMin,
        priceMax,
        defaultTokenASum
    )

    for (const pool of Object.keys(pools)) {
        globalState.pools.set(pools[pool].name, pools[pool])
    }

    for (const quest of quests) {
        globalState.quests.set(quest.name, quest)
    }

    // Deposit USDC in all USDC pools
    const [usdcAIn, aOut] = pools.poolA.buy(1000) // Buy Token A
    mockInvestor1.addBalance(pools.poolA.tokenLeft.name, usdcAIn)
    mockInvestor1.addBalance(pools.poolA.tokenRight.name, aOut)

    const [usdcBIn, bOut] = pools.poolB.buy(1000) // Buy Token B
    mockInvestor1.addBalance(pools.poolB.tokenLeft.name, usdcBIn)
    mockInvestor1.addBalance(pools.poolB.tokenRight.name, bOut)

    const [usdcCIn, cOut] = pools.poolC.buy(1000) // Buy Token C
    mockInvestor1.addBalance(pools.poolC.tokenLeft.name, usdcCIn)
    mockInvestor1.addBalance(pools.poolC.tokenRight.name, cOut)

    const [usdcDIn, dOut] = pools.poolD.buy(1000) // Buy Token D
    mockInvestor1.addBalance(pools.poolD.tokenLeft.name, usdcDIn)
    mockInvestor1.addBalance(pools.poolD.tokenRight.name, dOut)

    const [usdcEIn, eOut] = pools.poolE.buy(1000) // Buy Token E
    mockInvestor1.addBalance(pools.poolE.tokenLeft.name, usdcEIn)
    mockInvestor1.addBalance(pools.poolE.tokenRight.name, eOut)

    // Deposit Tokens in Cross Pools
    const [abIn, abOut] = pools.AB.buy(20) // Buy B by selling A
    mockInvestor1.addBalance(pools.AB.tokenLeft.name, abIn)
    mockInvestor1.addBalance(pools.AB.tokenRight.name, abOut)

    const [caIn, caOut] = pools.CA.buy(20) /// Buy A by selling C
    mockInvestor1.addBalance(pools.CA.tokenLeft.name, caIn)
    mockInvestor1.addBalance(pools.CA.tokenRight.name, caOut)

    const [cbIn, cbOut] = pools.CB.buy(20) // Buy B by selling C
    mockInvestor1.addBalance(pools.CB.tokenLeft.name, cbIn)
    mockInvestor1.addBalance(pools.CB.tokenRight.name, cbOut)

    const [ceIn, ceOut] = pools.CE.buy(20) /// Buy E by selling C
    mockInvestor1.addBalance(pools.CE.tokenLeft.name, ceIn)
    mockInvestor1.addBalance(pools.CE.tokenRight.name, ceOut)

    const [adIn, adOut] = pools.AD.buy(20) // Buy D by selling A
    mockInvestor1.addBalance(pools.AD.tokenLeft.name, adIn)
    mockInvestor1.addBalance(pools.AD.tokenRight.name, adOut)

    const [dcIn, dcOut] = pools.DC.buy(20) // Buy C by selling D
    mockInvestor1.addBalance(pools.DC.tokenLeft.name, dcIn)
    mockInvestor1.addBalance(pools.DC.tokenRight.name, dcOut)

    const [deIn, deOut] = pools.DE.buy(20) // Buy E by selling D
    mockInvestor1.addBalance(pools.DE.tokenLeft.name, deIn)
    mockInvestor1.addBalance(pools.DE.tokenRight.name, deOut)

    const [ebIn, ebOut] = pools.EB.buy(20) /// Buy B by selling E
    mockInvestor1.addBalance(pools.EB.tokenLeft.name, ebIn)
    mockInvestor1.addBalance(pools.EB.tokenRight.name, ebOut)

    const poolList = router.findPoolsFor('AGORA_A')
    const graph = router.graphPools(poolList)
    const paths = graph.buildPathways('AGORA_A', 'AGORA_D')
    const swapData = router.drySwapAllForAmounts(paths, amount)
    const [sortedPrices, pricedPaths] = router.sortByBestPrice(swapData)
    const balancesResult = router.smartSwapPaths(
        pricedPaths,
        sortedPrices,
        totalAmount,
        amount
    )
    mockInvestor2.addBalance('AGORA_A', balancesResult[0])
    mockInvestor2.addBalance('AGORA_D', balancesResult[1])

    expect(graph.adjList.get('AGORA_A')).toEqual([
        'USDC',
        'AGORA_B',
        'AGORA_C',
        'AGORA_D'
    ])

    expect(swapData[0][0].in).toBeCloseTo(10)
    expect(swapData[0][3].out).toBeCloseTo(6.891)
    expect(sortedPrices[5]).toBeCloseTo(1.069)
    expect(sortedPrices[0]).toBeCloseTo(0.9799)
    expect(mockInvestor2.balances['AGORA_A']).toBe(1606)
    expect(mockInvestor2.balances['AGORA_D']).toBeCloseTo(437)
})

it('Smart route within 1 chunk without enough amount', () => {})

it('Smart route within 2 chunks without enough amount', () => {})

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

fit('Smart route with USDC buying from new pool', () => {
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
    expect(results2[0]).toBeNaN() // pool wasn't added to global state
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
    globalState.quests.set(questB.name, questB)
    globalState.pools.set(poolB.name, poolB)
    poolB.buy(555) // Buy TEST_2 (around 500)

    // [TEST 1, TEST 2] (cited/citing)
    const AB = creator.createPool(questB, questA)
    creator.citeQuest(AB, priceMin, priceMax, citeAmount, 0)
    globalState.pools.set(AB.name, AB)
    AB.buy(25)

    const results = router.smartSwap('USDC', 'TEST_2', amount, 5)

    expect(results[0]).toBeCloseTo(-99.847)
    expect(results[1]).toBeCloseTo(92.97)
})
