import HashMap from 'hashmap'

import Generator from '../logic/Generators/Generator.class'
import { invGen, questGen } from '../logic/Generators/initialState'
import Investor from '../logic/Investor/Investor.class'
import UsdcToken from '../logic/Quest/UsdcToken.class'
import Router from '../logic/Router/Router.class'

let globalState = {
    pools: new HashMap(),
    investors: new HashMap(),
    quests: new HashMap()
}

/**
 * @TODO: Add many tests :)
 */

beforeAll(() => {
    process.env.NODE_ENV = 'test'
})

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
        globalState.investors.set(creator.hash, creator)
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
            globalState.investors,
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

    xit('Trades provided pool with increased price', () => {
        const creator = Investor.create('creator', 'creator', 10000)
        globalState.investors.set(creator.hash, creator)

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
            globalState.investors,
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

describe('Money loss sanity tests', () => {
    const getTotalIssuedUSDC = () =>
        globalState.investors
            .values()
            .filter((x) => x.default)
            .reduce((acc, i) => acc + i.initialBalance, 0)

    const getTotalIssuedUSDCDynamic = () =>
        globalState.investors
            .values()
            .filter((x) => !x.default)
            .reduce((acc, i) => acc + i.initialBalance, 0)

    const getTotalIssuedTokens = () =>
        globalState.quests
            .values()
            .filter((x) => !(x instanceof UsdcToken))
            .map((q) => ({
                name: q.name,
                total: q.initialBalanceB
            }))

    const getTotalLockedUSDC = () =>
        globalState.pools.values().reduce((acc, p) => {
            return p.isQuest() ? acc + p.volumeToken0 : acc + 0
        }, 0)

    const getTotalLockedTokens = () =>
        globalState.quests
            .values()
            .filter((x) => !(x instanceof UsdcToken))
            .map((q) => {
                let totalQTokens = 0

                q.pools.forEach((p) => {
                    const pool = globalState.pools.get(p)
                    totalQTokens +=
                        pool.tokenLeft === q.name
                            ? pool.volumeToken0
                            : pool.volumeToken1
                })

                return { name: q.name, total: totalQTokens }
            })

    const getTotalWalletsUSDC = () =>
        globalState.investors
            .values()
            .reduce((acc, inv) => acc + inv.balances['USDC'], 0)

    const getTotalWalletsTokens = () =>
        globalState.quests
            .values()
            .filter((x) => !(x instanceof UsdcToken))
            .map((q) => {
                let totalQTokens = 0

                globalState.investors.values().forEach((inv) => {
                    totalQTokens += inv.balances[q.name]
                        ? inv.balances[q.name]
                        : 0
                })

                return { name: q.name, total: totalQTokens }
            })

    const getTotalMissingUSDC = () =>
        getTotalIssuedUSDC() +
        getTotalIssuedUSDCDynamic() -
        getTotalLockedUSDC() -
        getTotalWalletsUSDC()

    const getTotalMissingTokens = () =>
        globalState.quests
            .values()
            .filter((x) => !(x instanceof UsdcToken))
            .map((q) => {
                const totalIssuedToken = getTotalIssuedTokens().find(
                    (ti) => ti.name === q.name
                )
                const totalLockedToken = getTotalLockedTokens().find(
                    (tl) => tl.name === q.name
                )
                const totalWalletToken = getTotalWalletsTokens().find(
                    (tw) => tw.name === q.name
                )

                return {
                    name: q.name,
                    total:
                        totalIssuedToken.total -
                        totalLockedToken.total -
                        totalWalletToken.total
                }
            })

    fit('Generates investors', async () => {
        jest.retryTimes(0)

        const invAuthor = {
            ...invGen,
            dailySpawnProbability: 100,
            invGenAlias: 'AUTHOR',
            invGenName: 'Author',
            createQuest: 'RUTHER',
            keepCreatingPeriodDays: 0,
            keepCreatingQuests: ''
            //excludeSingleName: 'AGORA'
        }
        const invInvestor = {
            ...invGen,
            dailySpawnProbability: 100,
            invGenAlias: 'TWODAY',
            invGenName: 'Investor',
            buySellPeriodDays: 1
        }
        const questModule = {
            ...questGen,
            questGenAlias: 'RUTHER',
            questGenName: 'Ruther',
            citeSingleName: 'AGORA'
        }

        const creator = Investor.create('creator', 'creator', 10000, true)
        const fndQuest = creator.createQuest('AGORA')
        const fndPool = fndQuest.createPool()
        const [totalIn, totalOut] = fndPool.buy(5550)
        creator.addBalance(fndPool.tokenLeft, totalIn)
        creator.addBalance(fndPool.tokenRight, totalOut)
        globalState.investors.set(creator.hash, creator)

        globalState.quests.set(fndQuest.name, fndQuest)
        globalState.pools.set(fndPool.name, fndPool)

        const performanceTest = true
        const genManager = new Generator(
            [invAuthor, invInvestor],
            [questModule],
            globalState.pools,
            globalState.quests,
            globalState.investors,
            performanceTest
        )

        let dayPerf = []

        const tot0 = performance.now()

        const genDays = 5
        for (let day = 1; day <= genDays; day++) {
            console.log(`Simulating day ${day}`)
            const d0 = performance.now()
            const stepData = await genManager.step(day)
            const d1 = performance.now()

            /*eslint-disable */
            stepData.investors.forEach((investor) => {
                if (!globalState.investors.has(investor.hash)) {
                    globalState.investors.set(investor.hash, investor)
                }
            })
            stepData.quests.forEach((quest) => {
                if (!globalState.quests.has(quest.name)) {
                    globalState.quests.set(quest.name, quest)
                }
            })
            stepData.pools.forEach((pool) => {
                if (!globalState.pools.has(pool.name)) {
                    globalState.pools.set(pool.name, pool)
                }
            })
            /*eslint-enable */

            const daySec = d1 - d0 >= 1000 ? true : false
            dayPerf.push({
                day,
                ms: !daySec ? `${(d1 - d0).toFixed(2)}ms` : null,
                sec: daySec ? `${((d1 - d0) / 1000).toFixed(2)}sec` : null
            })
            // genManager.router
            //     .getSwaps()
            //     .forEach((swap) =>
            //         swap.op !== 'BOUGHT' ? console.log(swap) : null
            //     )
        }

        const missingTokens = getTotalMissingTokens()

        console.log(missingTokens)

        const tot1 = performance.now()

        // globalState.quests = genManager.getQuests()
        // globalState.investors = genManager.getInvestors()

        // console.log(`||| TOTAL TRADING OPERATIONS: ${genManager.getOps()} |||`)
        // console.log(`Days performance`)
        // console.table(dayPerf)

        // //console.table(genManager.getOpsTime())

        // const totalTime = tot1 - tot0
        // const totMeasure = genManager.getOpsTime()
        // const totalMeasured = Object.keys(totMeasure).reduce((p, n, k) => {
        //     return p + totMeasure[n].time
        // }, 0)

        // console.table({
        //     total: (totalTime / 1000).toFixed(2),
        //     totalTrade: (totalMeasured / 1000).toFixed(2)
        // })

        // console.table(
        //     globalState.investors.map((inv) => ({
        //         name: inv.name,
        //         usdc: inv.balances.USDC
        //     }))
        // )

        // console.table(
        //     globalState.quests.map((q) => ({
        //         name: q.name,
        //         pools: q.pools.length
        //     }))
        // )

        // console.table(
        //     globalState.pools.map((p) => ({
        //         name: p.name,
        //         curp: p.curPrice,
        //         mcap: p.getMarketCap(),
        //         tvl: p.getTVL(),
        //         isQ: p.isQuest()
        //     }))
        // )
    })
})

it('Generates quests', () => {})

it('Generates pools', () => {})

it('Generates cross pools', () => {})

it('Generates cites quests', () => {})

it('Runs trading in parallel workers', async () => {})
