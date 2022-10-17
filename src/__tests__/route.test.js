import HashMap from 'hashmap'

import Generator from '../logic/Generators/Generator.class'
import { invGen, questGen } from '../logic/Generators/initialState'
import Investor from '../logic/Investor/Investor.class'
import UsdcToken from '../logic/Quest/UsdcToken.class'
import Router from '../logic/Router/Router.class'
import { prepareCrossPools, preparePool } from './helpers/poolManager'

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

describe('Chunking amounts', () => {
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
})

describe('Graph', () => {
    it('Graphs single pool properly', () => {
        const creator = Investor.create('creator', 'creator', 10000)
        const questA = creator.createQuest('TEST_1')
        const poolA = questA.createPool() // Deposit A
        globalState.quests.set('USDC', new UsdcToken())
        globalState.quests.set(questA.name, questA)
        globalState.pools.set(poolA.name, poolA)

        const router = new Router(globalState.quests, globalState.pools)

        const poolsList = router.findPoolsFor('TEST_1')
        const graph = router.graphPools(poolsList)

        expect(poolsList[0].tokenLeft).toBe('USDC')
        expect(poolsList[0].tokenRight).toBe('TEST_1')

        expect(graph.adjList.has('USDC')).toBe(true)
        expect(graph.adjList.has('TEST_1')).toBe(true)
    })
})

describe('Path finding', () => {
    it('Finds pools for token->USDC', () => {
        const { pool, tokenRight, tokenLeft } = preparePool()

        pool.buy(2000)
        globalState.pools.set(pool.name, pool)
        globalState.quests.set(tokenRight.name, tokenRight)
        const router = new Router(globalState.quests, globalState.pools)

        const sums = router.smartSwap(tokenRight.name, tokenLeft.name, 1000)

        expect(sums[0]).toBeCloseTo(-1000, 0)
        expect(sums[1]).toBeCloseTo(1527, 0)
    })

    xit('Finds paths for pair', async () => {
        const gen = new Generator()
        const router = new Router()

        const genDays = 20
        const invAuthor = {
            ...invGen,
            dailySpawnProbability: 100,
            invGenAlias: 'AUTHOR',
            createQuest: 'AGORA',
            initialBalance: 10000000
        }
        const queAuthor = {
            ...questGen,
            questGenAlias: 'AGORA',
            initialAuthorInvest: 1000
        }

        const genManager = new Generator(
            [invAuthor],
            [queAuthor],
            globalState.pools,
            globalState.quests
        )

        for (let day = 1; day <= genDays; day++) {
            await genManager.step(day)
        }

        globalState.pools = genManager.getPools()
        globalState.quests = genManager.getQuests()
        globalState.investors = genManager.getInvestors()
    })
})

describe('Routing', () => {
    it('Smart route with single pool', () => {
        const creator = Investor.create('creator', 'creator', 10000)

        const questX = creator.createQuest('TEST_X')
        const poolTest = questX.createPool()
        let allSums = [0, 0]
        for (let i = 1; i <= 500; i++) {
            const sums = poolTest.buy(10)
            allSums[0] += sums[0]
            allSums[1] += sums[1]
        }

        const questA = creator.createQuest('TEST_1')
        const poolA = questA.createPool() // Mint TEST_1
        globalState.quests.set(questA.name, questA)
        globalState.quests.set('USDC', new UsdcToken())
        globalState.pools.set(poolA.name, poolA)

        const router = new Router(globalState.quests, globalState.pools)
        const results1 = router.smartSwap('USDC', 'TEST_1', 5000)

        expect(poolA.curPrice).toBeCloseTo(poolTest.curPrice)
        expect(results1[1]).toBeCloseTo(allSums[1])
        expect(results1[0]).toBeCloseTo(-5000)
        expect(results1[1]).toBeCloseTo(2512.562)
    })

    it('Smart route with single pool and high amount', () => {
        const creator = Investor.create('creator', 'creator', 10000)

        const questA = creator.createQuest('TEST_1')
        const poolA = questA.createPool() // Mint TEST_1
        globalState.quests.set(questA.name, questA)
        globalState.pools.set(poolA.name, poolA)
        globalState.quests.set('USDC', new UsdcToken())

        const router = new Router(globalState.quests, globalState.pools)
        const results1 = router.smartSwap('USDC', 'TEST_1', 2500000)
        // [ -2500000.000001435, 16380.246286907708 ] - 10: 18.6s
        // [ -2500000.0000000363, 16380.246286902951 ] - 100: 0.74s
        // [ -2500000.0000000363, 16380.246286902951 ] - 1000: 0.271s

        expect(results1[0]).toBeCloseTo(-2500000)
        expect(results1[1]).toBeCloseTo(16380.246)
    })

    it('Smart route with amount above 100 with high chunk size', () => {
        const creator = Investor.create('creator', 'creator', 10000)

        const questA = creator.createQuest('TEST_1')
        const poolA = questA.createPool() // Mint TEST_1
        globalState.quests.set(questA.name, questA)
        globalState.pools.set(poolA.name, poolA)
        globalState.quests.set('USDC', new UsdcToken())

        const router = new Router(globalState.quests, globalState.pools)
        const results1 = router.smartSwap('USDC', 'TEST_1', 153)

        expect(results1[0]).toBeCloseTo(-153)
        expect(results1[1]).toBeCloseTo(148.501)
    })

    it('Smart route with amount below 100 with sliced chunk', () => {
        const creator = Investor.create('creator', 'creator', 10000)

        const questA = creator.createQuest('TEST_1')
        const poolA = questA.createPool() // Mint TEST_1
        globalState.quests.set(questA.name, questA)
        globalState.pools.set(poolA.name, poolA)
        globalState.quests.set('USDC', new UsdcToken())

        const router = new Router(globalState.quests, globalState.pools)
        const results1 = router.smartSwap('USDC', 'TEST_1', 98)

        expect(results1[0]).toBeCloseTo(-98)
        expect(results1[1]).toBeCloseTo(96.134)
    })

    it('Smart route with amount based on liquidity', () => {
        const creator = Investor.create('creator', 'creator', 10000)

        const questA = creator.createQuest('TEST_1')
        const poolA = questA.createPool() // Mint TEST_1
        poolA.buy(250000)

        globalState.quests.set(questA.name, questA)
        globalState.pools.set(poolA.name, poolA)
        globalState.quests.set('USDC', new UsdcToken())

        const questB = creator.createQuest('TEST_2')
        const poolB = questB.createPool() // Mint TEST_2

        globalState.quests.set(questB.name, questB)
        poolB.buy(250000)
        globalState.pools.set(poolB.name, poolB)

        const questC = creator.createQuest('TEST_3')
        const poolC = questC.createPool() // Mint TEST_3

        globalState.quests.set(questC.name, questC)
        globalState.pools.set(poolC.name, poolC)

        const startingPrice = questB.curPrice / questC.curPrice
        const BC = creator.createPool(questC, questB, startingPrice)
        questB.addPool(BC)
        questC.addPool(BC)

        globalState.pools.set(BC.name, BC)

        const pr = creator.calculatePriceRange(BC, poolC, poolB)
        creator.citeQuest(BC, pr.min, pr.max, 0, 10000, pr.native)

        // Different chunk should yield the same results
        const router = new Router(globalState.quests, globalState.pools)
        const results1 = router.smartSwap('USDC', 'TEST_2', 2500000)

        expect(results1[0]).toBeCloseTo(-2500000)
        expect(results1[1]).toBeCloseTo(7238, 0)
    })

    it('Swaps USDC for D through a long chain with enough token supply', () => {
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
        pools.DA.buy(100) // Buy D by selling A
        pools.DC.buy(93) // Buy C by selling D
        pools.DE.buy(77) // Buy E by selling D
        pools.EB.buy(44) /// Buy B by selling E

        const router = new Router(globalState.quests, globalState.pools)
        const res1 = router.smartSwap('USDC', 'AGORA_D', 25000)

        expect(res1[0]).toBeCloseTo(-25000)
        expect(res1[1]).toBeCloseTo(3948, 0) // was 3852
    })

    it('Swaps USDC for D through a long chain with different crosspool supplies', () => {
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

        const router = new Router(globalState.quests, globalState.pools)
        const res1 = router.smartSwap('USDC', 'AGORA_D', 25000, 2)

        expect(res1[0]).toBeCloseTo(-25000)
        expect(res1[1]).toBeCloseTo(4018, 0) // was: 4012.552, 4017.970
    })

    it('Swaps USDC for D through a long chain with amount below chunk size', () => {
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

        const router = new Router(globalState.quests, globalState.pools)
        const res1 = router.smartSwap('USDC', 'AGORA_D', 5)

        expect(res1[0]).toBeCloseTo(-5)
        expect(res1[1]).toBeCloseTo(3.48)
    })

    it('Smart route with one citation selling USDC/TEST1', () => {
        const priceMin = 1
        const priceMax = 10
        const citeAmount = 27

        const creator = Investor.create('creator', 'creator', 10000)

        const questA = creator.createQuest('TEST_1')
        const poolA = questA.createPool() // Deposit A
        globalState.quests.set('USDC', new UsdcToken())
        globalState.quests.set(questA.name, questA)
        globalState.pools.set(poolA.name, poolA)

        const questB = creator.createQuest('TEST_2')
        const poolB = questB.createPool() // Deposit B
        globalState.quests.set(questB.name, questB)
        globalState.pools.set(poolB.name, poolB)

        // [TEST 2, TEST 1] (cited/citing)
        const startingPrice = questA.curPrice / questB.curPrice
        const AB = creator.createPool(questB, questA, startingPrice)
        questA.addPool(AB)
        questB.addPool(AB)
        creator.citeQuest(AB, priceMin, priceMax, 0, citeAmount)
        globalState.pools.set(AB.name, AB)

        const router = new Router(globalState.quests, globalState.pools)
        const res1 = router.smartSwap('USDC', 'TEST_1', 555)
        const res2 = router.smartSwap('TEST_1', 'USDC', 50)
        const res3 = router.smartSwap('TEST_1', 'USDC', 50)

        expect(res1[0]).toBeCloseTo(-555)
        expect(res1[1]).toBeCloseTo(444, 0)

        expect(res2[0]).toBeCloseTo(-50)
        expect(res2[1]).toBeCloseTo(114, 0)

        expect(res3[0]).toBeCloseTo(-50)
        expect(res3[1]).toBeCloseTo(58, 0)
    })

    it('Smart route with USDC buying citing', () => {
        const priceMin = 1
        const priceMax = 10
        const amount = 100
        const citeAmount = 25

        const creator = Investor.create('creator', 'creator', 10000)

        const questA = creator.createQuest('TEST_1')
        const poolA = questA.createPool() // Deposit A
        globalState.quests.set('USDC', new UsdcToken())
        globalState.quests.set(questA.name, questA)
        globalState.pools.set(poolA.name, poolA)

        const questB = creator.createQuest('TEST_2')
        const poolB = questB.createPool() // Deposit B
        globalState.quests.set(questB.name, questB)
        globalState.pools.set(poolB.name, poolB)
        poolB.buy(555) // Buy TEST_2 (around 500)

        // [TEST 1, TEST 2] (cited/citing)
        const startingPrice = questA.curPrice / questB.curPrice
        const AB = creator.createPool(questB, questA, startingPrice)
        questA.addPool(AB)
        questB.addPool(AB)
        creator.citeQuest(AB, priceMin, priceMax, citeAmount, 0)
        globalState.pools.set(AB.name, AB)
        AB.buy(25)

        const router = new Router(globalState.quests, globalState.pools)
        const results = router.smartSwap('USDC', 'TEST_1', amount)

        expect(results[0]).toBeCloseTo(-100)
        expect(results[1]).toBeCloseTo(98.058)
    })

    it('Smart route with USDC buying cited', () => {
        const priceMin = 1
        const priceMax = 10
        const amount = 100
        const citeAmount = 25

        const creator = Investor.create('creator', 'creator', 10000)

        const questA = creator.createQuest('TEST_1')
        const poolA = questA.createPool() // Deposit A
        globalState.quests.set('USDC', new UsdcToken())
        globalState.quests.set(questA.name, questA)
        globalState.pools.set(poolA.name, poolA)

        const questB = creator.createQuest('TEST_2')
        const poolB = questB.createPool() // Deposit B
        globalState.quests.set(questB.name, questB)
        globalState.pools.set(poolB.name, poolB)
        poolB.buy(555) // Buy TEST_2 (around 500)

        // [TEST 1, TEST 2] (cited/citing)
        const startingPrice = questA.curPrice / questB.curPrice
        const AB = creator.createPool(questB, questA, startingPrice)
        questA.addPool(AB)
        questB.addPool(AB)
        creator.citeQuest(AB, priceMin, priceMax, 0, citeAmount)
        globalState.pools.set(AB.name, AB)
        AB.buy(25)

        const router = new Router(globalState.quests, globalState.pools)
        const results = router.smartSwap('USDC', 'TEST_2', amount)

        expect(results[0]).toBeCloseTo(-100)
        expect(results[1]).toBeCloseTo(25, 0) // was: 92.97
    })

    it('Smart route for token through cited cross pool', () => {
        const creator = Investor.create('creator', 'creator', 10000)

        const questA = creator.createQuest('TEST')
        const poolA = questA.createPool() // Deposit A
        globalState.quests.set('USDC', new UsdcToken())
        globalState.quests.set(questA.name, questA)
        globalState.pools.set(poolA.name, poolA)
        poolA.buy(5000)

        const questB = creator.createQuest('AGORA')
        const poolB = questB.createPool() // Deposit B
        globalState.quests.set(questB.name, questB)
        globalState.pools.set(poolB.name, poolB)

        const startingPrice = questA.curPrice / questB.curPrice
        const AB = creator.createPool(questB, questA, startingPrice)
        const priceRange = creator.calculatePriceRange(AB, poolB, poolA, 2)
        questA.addPool(AB)
        questB.addPool(AB)
        creator.citeQuest(
            AB,
            priceRange.min,
            priceRange.max,
            0,
            1005,
            priceRange.native
        )
        globalState.pools.set(AB.name, AB)

        const router = new Router(globalState.quests, globalState.pools)
        const res3 = router.smartSwap('USDC', 'TEST', 2000)

        expect(res3[0]).toBeCloseTo(-2000)
        expect(res3[1]).toBeCloseTo(441, 0) // was: 441, 421
    })

    it('Smart route for token through cited cross pool with multiple smart swaps', () => {
        const creator = Investor.create('creator', 'creator', 10000)

        const questA = creator.createQuest('TEST')
        const poolA = questA.createPool() // Deposit A
        globalState.quests.set('USDC', new UsdcToken())
        globalState.quests.set(questA.name, questA)
        globalState.pools.set(poolA.name, poolA)
        poolA.buy(5000)

        const questB = creator.createQuest('AGORA')
        const poolB = questB.createPool() // Deposit B
        globalState.quests.set(questB.name, questB)
        globalState.pools.set(poolB.name, poolB)

        const startingPrice = questA.curPrice / questB.curPrice
        const AB = creator.createPool(questB, questA, startingPrice)
        const priceRange = creator.calculatePriceRange(poolB, poolA, 2)
        questA.addPool(AB)
        questB.addPool(AB)
        creator.citeQuest(AB, priceRange.min, priceRange.max, 0, 1005)
        globalState.pools.set(AB.name, AB)

        const router = new Router(globalState.quests, globalState.pools)
        const res1 = router.smartSwap('USDC', 'TEST', 250)
        expect(res1[0]).toBeCloseTo(-250)
        expect(res1[1]).toBeCloseTo(61.59, 0) // 116

        const res2 = router.smartSwap('USDC', 'TEST', 100)
        expect(res2[0]).toBeCloseTo(-100)
        expect(res2[1]).toBeCloseTo(23.8, 0) // 41

        const res3 = router.smartSwap('USDC', 'TEST', 50)
        expect(res3[0]).toBeCloseTo(-50)
        expect(res3[1]).toBeCloseTo(11.73, 0) // 20

        const res4 = router.smartSwap('USDC', 'TEST', 650)
        const res5 = router.smartSwap('USDC', 'TEST', 400)
        const res6 = router.smartSwap('USDC', 'TEST', 400)
        const res7 = router.smartSwap('USDC', 'TEST', 150)

        const sumIn =
            res1[0] + res2[0] + res3[0] + res4[0] + res5[0] + res6[0] + res7[0]
        const sumOut =
            res1[1] + res2[1] + res3[1] + res4[1] + res5[1] + res6[1] + res7[1]
        expect(sumIn).toBeCloseTo(-2000)
        expect(sumOut).toBeCloseTo(421, 0) // 619
        expect(poolA.curPrice).toBeCloseTo(5.69, 0) // 4.36
        expect(poolB.curPrice).toBeCloseTo(1, 0) // 1.69
    })
})
