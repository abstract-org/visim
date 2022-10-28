import HashMap from 'hashmap'

import Generator from '../logic/Generators/Generator.class'
import { invGen, questGen } from '../logic/Generators/initialState'
import Investor from '../logic/Investor/Investor.class'
import UsdcToken from '../logic/Quest/UsdcToken.class'
import Router from '../logic/Router/Router.class'
import {
    getMaxOneShotBuy,
    getMaxOneShotSell,
    maxSameLiqBuyIn,
    maxSameLiqBuyOut,
    maxSameLiqSellIn,
    maxSameLiqSellOut
} from '../logic/Router/math'
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
    const initialPositions = [
        {
            priceMin: 1,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        },
        {
            priceMin: 20,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        },
        {
            priceMin: 50,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        },
        {
            priceMin: 200,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        }
    ]
    it('Finds pools for token->USDC', () => {
        const { pool, tokenRight, tokenLeft } = preparePool(
            10000,
            'investor',
            initialPositions
        )

        pool.buy(2000)
        globalState.pools.set(pool.name, pool)
        globalState.quests.set(tokenRight.name, tokenRight)
        const router = new Router(globalState.quests, globalState.pools)

        const sums = router.smartSwap(tokenRight.name, tokenLeft.name, 1000)

        expect(sums[0]).toBeCloseTo(-1000, 0)
        expect(sums[1]).toBeCloseTo(1527, 0) // was
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

describe('Router functions', () => {
    const investor = Investor.create('INV', 'INV', 10000)

    const getQP = (name) => {
        const quest = investor.createQuest(name)
        const pool = quest.createPool({
            tokenLeft: new UsdcToken(),
            initialPositions: [
                { priceMin: 1, priceMax: 10000, tokenA: 0, tokenB: 5000 },
                { priceMin: 20, priceMax: 10000, tokenA: 0, tokenB: 5000 },
                { priceMin: 50, priceMax: 10000, tokenA: 0, tokenB: 5000 },
                {
                    priceMin: 200,
                    priceMax: 10000,
                    tokenA: 0,
                    tokenB: 5000
                }
            ]
        })

        return { quest, pool }
    }

    const getCP = (
        citingQ,
        citedQ,
        citingP,
        citedP,
        citedSumA = 0,
        citedSumB = 0
    ) => {
        const AB = investor.createPool(citedQ, citingQ)
        citedQ.addPool(AB)
        citingQ.addPool(AB)

        const priceRange = investor.calculatePriceRange(AB, citedP, citingP, 2)
        investor.citeQuest(
            AB,
            priceRange.min,
            priceRange.max,
            citedSumA,
            citedSumB,
            priceRange.native
        )

        return { crossPool: AB }
    }

    it('Cleans up intersecting paths', () => {
        const router = new Router(new HashMap(), new HashMap())
        const res = router.cleanUpPaths([
            { path: ['USDC', 'AGORA'] },
            { path: ['USDC', 'AGORA', 'PET'] },
            { path: ['USDC', 'PET', 'DIVIDE'] },
            { path: ['AGORA', 'TRIO', 'MAN'] },
            { path: ['TROUBLE', 'FIGURE', 'USDC'] }
        ])

        expect(res.length).toBe(3)
    })

    fit('Calculates max in through chain and fixes backwards', () => {
        const { quest: questA, pool: A } = getQP('A')
        const { quest: questB, pool: B } = getQP('B')
        const { quest: questC, pool: C } = getQP('C')

        A.buy(1500)
        B.buy(3500)
        C.buy(4500)

        const { crossPool: BA } = getCP(questA, questB, B, A, 500, 0)
        const { crossPool: CB } = getCP(questB, questC, C, B, 1000, 0)

        const pools = new HashMap()
        const quests = new HashMap()

        pools.set(A.name, A)
        pools.set(B.name, B)
        pools.set(C.name, C)
        pools.set(BA.name, BA)
        pools.set(CB.name, CB)

        quests.set(questA.name, questA)
        quests.set(questB.name, questB)
        quests.set(questC.name, questC)

        console.log(BA.dryBuy(1000000), BA.drySell(10000000))
        console.log(CB.dryBuy(2000000), CB.drySell(20000000))

        const router = new Router(quests, pools)

        const testRoute = ['USDC', 'A', 'B', 'C']
        router.calculateMaxIn(testRoute, 10000)
    })
})

describe('Routing', () => {
    const initialPositions = [
        {
            priceMin: 1,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        },
        {
            priceMin: 20,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        },
        {
            priceMin: 50,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        },
        {
            priceMin: 200,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        }
    ]

    it('Smart route and taking right amount in/out', () => {
        const creator = Investor.create('creator', 'creator', 10000)

        const questX = creator.createQuest('AGORA')
        const poolX = questX.createPool()
        poolX.buy(5550)

        const questA = creator.createQuest('RUTHER')
        const poolA = questA.createPool()
        poolA.buy(5000)

        const usdcToken = new UsdcToken()
        usdcToken.addPool(poolA)
        usdcToken.addPool(poolX)
        globalState.quests.set('USDC', usdcToken)

        const startingPrice = poolA.curPrice / poolX.curPrice
        const XA = creator.createPool(questX, questA, startingPrice)

        questA.addPool(XA)
        questX.addPool(XA)
        globalState.quests.set(questA.name, questA)
        globalState.quests.set(questX.name, questX)

        globalState.pools.set(poolA.name, poolA)
        globalState.pools.set(poolX.name, poolX)

        const pr = creator.calculatePriceRange(XA, poolX, poolA)
        creator.citeQuest(XA, pr.min, pr.max, 2, 172.57, pr.native)

        globalState.pools.set(XA.name, XA)

        const router = new Router(globalState.quests, globalState.pools)
        const results1 = router.smartSwap('USDC', 'RUTHER', 1000)

        const acc = router.getSwaps().reduce((acc, swap) => {
            return swap.pool === 'USDC-AGORA' ? acc + swap.out : acc + 0
        }, 0)

        const acc2 = router.getSwaps().reduce((acc, swap) => {
            return swap.pool === 'AGORA-RUTHER' ? acc + swap.in : acc + 0
        }, 0)

        expect(acc).toBeCloseTo(acc2)
        expect(results1[0]).toBeCloseTo(-999.999)
        expect(results1[1]).toBeCloseTo(164.694)
    })

    it('Dry swap smart route before actual swap', () => {
        const creator = Investor.create('creator', 'creator', 10000)

        const questX = creator.createQuest('AGORA')
        const poolX = questX.createPool()

        poolX.buy(5550)

        const questA = creator.createQuest('RUTHER')
        const poolA = questA.createPool()
        poolA.buy(5000)

        const usdcToken = new UsdcToken()
        usdcToken.addPool(poolA)
        usdcToken.addPool(poolX)
        globalState.quests.set('USDC', usdcToken)

        const startingPrice = poolA.curPrice / poolX.curPrice
        const XA = creator.createPool(questX, questA, startingPrice)

        questA.addPool(XA)
        questX.addPool(XA)
        globalState.quests.set(questA.name, questA)
        globalState.quests.set(questX.name, questX)

        globalState.pools.set(poolA.name, poolA)
        globalState.pools.set(poolX.name, poolX)

        const pr = creator.calculatePriceRange(XA, poolX, poolA)
        creator.citeQuest(XA, pr.min, pr.max, 2, 172.57, pr.native)

        globalState.pools.set(XA.name, XA)

        const router = new Router(globalState.quests, globalState.pools)

        expect(
            maxSameLiqBuyIn(poolX.curLiq, poolX.curPrice, 205.3905466)
        ).toBeCloseTo(-1000, 0)
        expect(
            maxSameLiqBuyOut(poolX.curLiq, poolX.curPrice, 1000)
        ).toBeCloseTo(-205.3905, 0)
        expect(
            maxSameLiqSellIn(poolX.curLiq, poolX.curPrice, 3128.9953660188066)
        ).toBeCloseTo(1000, 0)
        expect(
            maxSameLiqSellOut(poolX.curLiq, poolX.curPrice, 1000)
        ).toBeCloseTo(3128.9953, 0)

        const results1 = router.smartSwap('USDC', 'RUTHER', 10000)

        const acc = router.getSwaps().reduce((acc, swap) => {
            return swap.pool === 'USDC-AGORA' ? acc + swap.out : acc + 0
        }, 0)

        const acc2 = router.getSwaps().reduce((acc, swap) => {
            return swap.pool === 'AGORA-RUTHER' ? acc + swap.in : acc + 0
        }, 0)

        expect(acc).toBeCloseTo(acc2)
        expect(results1[0]).toBeCloseTo(-9999.999)
        expect(results1[1]).toBeCloseTo(1313.9, 0)
    })

    it('Smart route with single pool', () => {
        const creator = Investor.create('creator', 'creator', 10000)

        const questX = creator.createQuest('TEST_X')
        const poolTest = questX.createPool({ initialPositions })
        let allSums = [0, 0]
        for (let i = 1; i <= 500; i++) {
            const sums = poolTest.buy(10)
            allSums[0] += sums[0]
            allSums[1] += sums[1]
        }

        const questA = creator.createQuest('TEST_1')
        const poolA = questA.createPool({ initialPositions }) // Mint TEST_1
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
        const poolA = questA.createPool({ initialPositions }) // Mint TEST_1
        globalState.quests.set(questA.name, questA)
        globalState.pools.set(poolA.name, poolA)
        globalState.quests.set('USDC', new UsdcToken())

        const router = new Router(globalState.quests, globalState.pools)
        const results1 = router.smartSwap('USDC', 'TEST_1', 2500000)
        // [ -2500000.000001435, 16380.246286907708 ] - 10: 18.6s
        // [ -2500000.0000000363, 16380.246286902951 ] - 100: 0.74s
        // [ -2500000.0000000363, 16380.246286902951 ] - 1000: 0.271s

        expect(results1[0]).toBeCloseTo(-2500000)
        expect(results1[1]).toBeCloseTo(16008, 0) // was 16380.246
    })

    it('Smart route with amount above 100 with high chunk size', () => {
        const creator = Investor.create('creator', 'creator', 10000)

        const questA = creator.createQuest('TEST_1')
        const poolA = questA.createPool({ initialPositions }) // Mint TEST_1
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
        const poolA = questA.createPool({ initialPositions }) // Mint TEST_1
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
        const poolA = questA.createPool({ initialPositions }) // Mint TEST_1
        poolA.buy(250000)

        globalState.quests.set(questA.name, questA)
        globalState.pools.set(poolA.name, poolA)
        globalState.quests.set('USDC', new UsdcToken())

        const questB = creator.createQuest('TEST_2')
        const poolB = questB.createPool({ initialPositions }) // Mint TEST_2
        poolB.buy(250000)

        globalState.quests.set(questB.name, questB)
        globalState.pools.set(poolB.name, poolB)

        const questC = creator.createQuest('TEST_3')
        const poolC = questC.createPool({ initialPositions }) // Mint TEST_3

        globalState.quests.set(questC.name, questC)
        globalState.pools.set(poolC.name, poolC)

        const startingPrice = questB.curPrice / questC.curPrice
        const BC = creator.createPool(questC, questB, startingPrice)
        questB.addPool(BC)
        questC.addPool(BC)

        globalState.pools.set(BC.name, BC)

        const pr = creator.calculatePriceRange(BC, poolC, poolB)
        creator.citeQuest(BC, pr.min, pr.max, 0, 10000, pr.native)

        const router = new Router(globalState.quests, globalState.pools)
        const results1 = router.smartSwap('USDC', 'TEST_2', 2500000)

        expect(results1[0]).toBeCloseTo(-2500000)
        expect(results1[1]).toBeCloseTo(447, 0) // !!!!!!!!!! WAS: 7238
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
        pools.BA.buy(20) // Buy B by selling A
        pools.AC.buy(50) /// Buy A by selling C
        pools.CB.buy(60) // Buy B by selling C
        pools.EC.buy(80) /// Buy E by selling C
        pools.DA.buy(100) // Buy D by selling A
        pools.CD.buy(93) // Buy C by selling D
        pools.ED.buy(77) // Buy E by selling D
        pools.BE.buy(44) /// Buy B by selling E

        const router = new Router(globalState.quests, globalState.pools)
        const res1 = router.smartSwap('USDC', 'AGORA_D', 25000)

        expect(res1[0]).toBeCloseTo(-25000)
        expect(res1[1]).toBeCloseTo(3603, 0) // was 3852 // was 3948 // was 2967
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
        expect(res1[1]).toBeCloseTo(3661, 0) // was: 4012.552, 4017.970, 4018
    })

    it('Smart route with one citation selling USDC/TEST1', () => {
        const priceMin = 1
        const priceMax = 10
        const citeAmount = 27

        const creator = Investor.create('creator', 'creator', 10000)

        const questA = creator.createQuest('TEST_1')
        const poolA = questA.createPool({ initialPositions }) // Deposit A
        globalState.quests.set('USDC', new UsdcToken())
        globalState.quests.set(questA.name, questA)
        globalState.pools.set(poolA.name, poolA)

        const questB = creator.createQuest('TEST_2')
        const poolB = questB.createPool({ initialPositions }) // Deposit B
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
        expect(res2[1]).toBeCloseTo(59, 0)

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
        expect(results[1]).toBeCloseTo(98, 0) // was 98.058
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
        expect(res3[1]).toBeCloseTo(411.6, 0) // was: 441, 421, 441, 416
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
        expect(res1[1]).toBeCloseTo(61, 0) // 116, 61.59

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
        expect(sumOut).toBeCloseTo(417, 0) // 619, 421
        expect(poolA.curPrice).toBeCloseTo(5.69, 0) // 4.36
        expect(poolB.curPrice).toBeCloseTo(1, 0) // 1.69
    })
})
