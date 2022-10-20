import HashMap from 'hashmap'

import Generator from '../logic/Generators/Generator.class'
import { invGen, questGen } from '../logic/Generators/initialState'
import Investor from '../logic/Investor/Investor.class'
import Router from '../logic/Router/Router.class'

let globalState = {
    pools: new HashMap(),
    investors: new HashMap(),
    quests: new HashMap()
}

/**
 * @TODO: Add many tests :)
 */

beforeAll(() => {})

afterEach(() => {
    globalState = {
        pools: new HashMap(),
        investors: new HashMap(),
        quests: new HashMap()
    }
})

describe('Trades increased in price quest', () => {
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

    it('Identifies quests that increased in price over X days', () => {
        const creator = Investor.create('creator', 'creator', 10000)
        const qA = creator.createQuest('A')
        const A = qA.createPool({ initialPositions })

        globalState.quests.set(qA.name, qA)
        globalState.pools.set(A.name, A)

        A.buy(1000)

        const genManager = new Generator(
            [],
            [],
            globalState.pools,
            globalState.quests,
            null,
            [
                {
                    pool: A.name,
                    day: 0,
                    price: A.curPrice,
                    tvl: A.getTVL(),
                    mcap: A.getMarketCap()
                }
            ]
        )

        A.buy(5000)
        creator.addBalance(qA.name, 5000)
        genManager.storeTradedPool(1, A)

        A.buy(500)
        creator.addBalance(qA.name, 500)
        genManager.storeTradedPool(2, A)

        A.buy(500)
        creator.addBalance(qA.name, 500)
        genManager.storeTradedPool(2, A)

        A.buy(1000)
        creator.addBalance(qA.name, 100)
        genManager.storeTradedPool(3, A)

        A.sell(200)
        creator.addBalance(qA.name, 400)
        genManager.storeTradedPool(4, A)

        A.buy(50)
        creator.addBalance(qA.name, 50)
        genManager.storeTradedPool(6, A)

        const selectedPools = genManager.getChangedPriceQuests(
            creator.balances,
            7,
            5,
            10,
            'sell'
        )

        expect(selectedPools[0].amount).toBeCloseTo(327.5)
    })

    it('Trades provided pool with increased price', () => {
        const creator = Investor.create('creator', 'creator', 10000)
        const qA = creator.createQuest('A')
        const A = qA.createPool({ initialPositions })

        globalState.quests.set(qA.name, qA)
        globalState.pools.set(A.name, A)

        const router = new Router(globalState.quests, globalState.pools)

        A.buy(1000)

        const genManager = new Generator(
            [],
            [],
            globalState.pools,
            globalState.quests,
            null,
            [
                {
                    pool: A.name,
                    day: 0,
                    price: A.curPrice,
                    tvl: A.getTVL(),
                    mcap: A.getMarketCap()
                }
            ]
        )

        A.buy(5000)
        creator.addBalance(qA.name, 5000)
        genManager.storeTradedPool(1, A)

        A.buy(500)
        creator.addBalance(qA.name, 500)
        genManager.storeTradedPool(2, A)

        A.buy(500)
        creator.addBalance(qA.name, 500)
        genManager.storeTradedPool(2, A)

        A.buy(1000)
        creator.addBalance(qA.name, 100)
        genManager.storeTradedPool(3, A)

        A.sell(200)
        creator.addBalance(qA.name, 400)
        genManager.storeTradedPool(4, A)

        A.buy(50)
        creator.addBalance(qA.name, 50)
        genManager.storeTradedPool(6, A)

        const selectedPools = genManager.getChangedPriceQuests(
            creator.balances,
            7,
            5,
            10,
            'sell'
        )

        const result = genManager.smartSwapPools(
            7,
            creator,
            router,
            selectedPools,
            3,
            'test:swap-inc-dec'
        )

        expect(selectedPools[0].amount).toBeCloseTo(327.5)
        expect(result[0]).toBeCloseTo(-327.5, 0)
        expect(result[1]).toBeCloseTo(1574.5, 0)
    })
})

fit('Generates investors', async () => {
    const invAuthor = {
        ...invGen,
        invGenAlias: 'AUTHOR',
        invGenName: 'Author',
        createQuest: 'AGORA',
        valueSellPeriodDays: 10,
        valueSellAmount: 200,
        keepCreatingPeriodDays: 10,
        keepCreatingQuests: 'AGORA'
    }
    const invInvestor = {
        ...invGen,
        invGenAlias: 'TWODAY',
        invGenName: 'Investor',
        buySellPeriodDays: 1,
        buyGainersFrequency: 3,
        excludeSingleName: 'AGORA',
        buySinglePerc: 0,
        swapDecFrequency: 2,
        swapIncDir: 'buy',
        swapDecSumPerc: 10,
        swapIncFrequency: 2
    }
    const queAuthor = {
        ...questGen,
        questGenAlias: 'AGORA',
        questGenName: 'Unrealistic Chlorine',
        citeSingleName: 'AGORA',
        citeSingleMultiplier: 2
    }

    const creator = Investor.create('creator', 'creator', 10000)
    const fndQuest = creator.createQuest('AGORA')
    const fndPool = fndQuest.createPool()
    fndPool.buy(50000)
    console.log(`Starting AGORA price ${fndPool.curPrice}`)
    globalState.quests.set(fndQuest.name, fndQuest)
    globalState.pools.set(fndPool.name, fndPool)

    const performanceTest = true
    const genManager = new Generator(
        [invAuthor, invInvestor],
        [queAuthor],
        globalState.pools,
        globalState.quests,
        null,
        performanceTest
    )

    let dayPerf = []

    const tot0 = performance.now()

    const genDays = 20
    for (let day = 1; day <= genDays; day++) {
        console.log(`Simulating day ${day}`)
        const d0 = performance.now()
        const dayData = await genManager.step(day)
        const d1 = performance.now()

        const daySec = d1 - d0 >= 1000 ? true : false
        dayPerf.push({
            day,
            ms: !daySec ? `${(d1 - d0).toFixed(2)}ms` : null,
            sec: daySec ? `${((d1 - d0) / 1000).toFixed(2)}sec` : null
        })
    }

    const tot1 = performance.now()

    globalState.pools = genManager.getPools()
    globalState.quests = genManager.getQuests()
    globalState.investors = genManager.getInvestors()

    console.log(`||| TOTAL TRADING OPERATIONS: ${genManager.getOps()} |||`)
    console.log(`Days performance`)
    console.table(dayPerf)

    //console.table(genManager.getOpsTime())

    const totalTime = tot1 - tot0
    const totMeasure = genManager.getOpsTime()
    const totalMeasured = Object.keys(totMeasure).reduce((p, n, k) => {
        return p + totMeasure[n].time
    }, 0)

    console.table({
        total: (totalTime / 1000).toFixed(2),
        totalTrade: (totalMeasured / 1000).toFixed(2)
    })

    console.table(
        globalState.investors.map((inv) => ({
            name: inv.name,
            usdc: inv.balances.USDC
        }))
    )

    console.table(
        globalState.quests.map((q) => ({
            name: q.name,
            pools: q.pools.length
        }))
    )

    console.table(
        globalState.pools.map((p) => ({
            name: p.name,
            curp: p.curPrice,
            mcap: p.getMarketCap(),
            tvl: p.getTVL(),
            isQ: p.isQuest()
        }))
    )
})

it('Generates quests', () => {})

it('Generates pools', () => {})

it('Generates cross pools', () => {})

it('Generates cites quests', () => {})

it('Runs trading in parallel workers', async () => {})
