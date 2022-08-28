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
    mockInvestor2.addBalance('AGORA_A', balancesResult['AGORA_A'])
    mockInvestor2.addBalance('AGORA_D', balancesResult['AGORA_D'])

    expect(graph.adjList.get('AGORA_A')).toEqual([
        'USDC',
        'AGORA_B',
        'AGORA_C',
        'AGORA_D'
    ])
    expect(paths.length).toBe(6)
    expect(swapData[0].length).toBe(4)
    expect(swapData[0][0].in).toBeCloseTo(10)
    expect(swapData[0][3].out).toBeCloseTo(9.234)
    expect(sortedPrices.length).toBe(6)
    expect(sortedPrices[5]).toBeCloseTo(9.589)
    expect(sortedPrices[0]).toBeCloseTo(0.111)
    expect(mockInvestor2.balances['AGORA_A']).toBe(10)
    expect(mockInvestor2.balances['AGORA_D']).toBeCloseTo(2980.17)
})

it('Smart route when there is not enough tokens for the amount in the paths', () => {
    const priceMin = 1
    const priceMax = 2
    const amount = 100
    const citeAmount = (amount / 100) * 5

    const creator = new Investor(1, 10000, 'creator')
    const router = new Router(globalState)

    const questA = creator.createQuest('AGORA_A')
    const poolA = questA.createPool() // Deposit A
    globalState.quests.set(questA.name, questA)
    globalState.pools.set(poolA.name, poolA)

    const questB = creator.createQuest('AGORA_B')
    const poolB = questB.createPool() // Deposit B
    globalState.quests.set(questB.name, questB)
    globalState.pools.set(poolB.name, poolB)

    const questC = creator.createQuest('AGORA_C')
    const poolC = questC.createPool() // Deposit C
    globalState.quests.set(questC.name, questC)
    globalState.pools.set(poolC.name, poolC)

    // [A,B]
    const AB = creator.createPool(questA, questB)
    creator.citeQuest(AB, priceMin, priceMax, 0, citeAmount)
    globalState.pools.set(AB.name, AB)
    // [B,C]
    const BC = creator.createPool(questB, questC)
    creator.citeQuest(BC, priceMin, priceMax, 0, citeAmount)
    globalState.pools.set(BC.name, BC)

    const results = router.smartSwap('AGORA_A', 'AGORA_C', amount)

    expect(results['AGORA_A']).toBe(-10)
    expect(results['AGORA_C']).toBeCloseTo(7.071)
})

fit('Smart route when there is enough tokens for the amount in the paths', () => {
    const priceMin = 1
    const priceMax = 2
    const amount = 100
    const citeAmount = (amount / 100) * 5

    const creator = new Investor(1, 10000, 'creator')
    const router = new Router(globalState)

    const questA = creator.createQuest('AGORA_A')
    const poolA = questA.createPool() // Deposit A
    globalState.quests.set(questA.name, questA)
    globalState.pools.set(poolA.name, poolA)

    const questB = creator.createQuest('AGORA_B')
    const poolB = questB.createPool() // Deposit B
    globalState.quests.set(questB.name, questB)
    globalState.pools.set(poolB.name, poolB)

    const questC = creator.createQuest('AGORA_C')
    const poolC = questC.createPool() // Deposit C
    globalState.quests.set(questC.name, questC)
    globalState.pools.set(poolC.name, poolC)

    // [A,B]
    const AB = creator.createPool(questA, questB)
    creator.citeQuest(AB, priceMin, priceMax, citeAmount, 0)
    globalState.pools.set(AB.name, AB)
    //AB.getSwapInfo(true)
    //console.log(AB.buy(100))
    //console.log(AB.sell(100))

    console.log(poolA.pricePoints.values())
    //poolA.getSwapInfo(true)
    poolA.buy(100000000)
    poolA.getSwapInfo(true)
    console.log(poolA.sell(20000))

    poolA.getSwapInfo(true)
    // [B,C]
    // const BC = creator.createPool(questB, questC)
    // creator.citeQuest(BC, priceMin, priceMax, citeAmount, 0)
    // globalState.pools.set(BC.name, BC)

    // BC.getSwapInfo(true)
    // const amts2 = BC.buy(amts[1]) // get 7C?

    // Citation balance side issue? why 7 and not 5?
    // Which tokens to deposit, citing or cited to the cross pool?

    const results = router.smartSwap('AGORA_A', 'AGORA_C', amount, 20)

    expect(results['AGORA_A']).toBe(-10)
    expect(results['AGORA_C']).toBeCloseTo(7.071)
})

it('Dry swap smart routes and restore states', () => {})
