import HashMap from 'hashmap'
import {Modules} from '@abstract-org/sdk'
import Generator from '../logic/Generators/Generator.class'
import { invGen, questGen } from '../logic/Generators/initialState'

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
        const creator = Modules.Investor.create('creator', 'creator', 10000)
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
        const creator = Modules.Investor.create('creator', 'creator', 10000)
        globalState.investors.set(creator.hash, creator)

        const qA = creator.createQuest('A')
        const A = qA.createPool({ initialPositions })

        globalState.quests.set(qA.name, qA)
        globalState.pools.set(A.name, A)

        const router = new Modules.Router(globalState.quests, globalState.pools)

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
            .filter((x) => !(x instanceof Modules.UsdcToken))
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
            .filter((x) => !(x instanceof Modules.UsdcToken))
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
            .filter((x) => !(x instanceof Modules.UsdcToken))
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
            .filter((x) => !(x instanceof Modules.UsdcToken))
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
        const invAuthor = {
            ...invGen,
            dailySpawnProbability: 100,
            invGenAlias: 'AUTHOR',
            invGenName: 'Author',
            createQuest: 'RUTHER',
            valueSellPeriodDays: 0,
            valueSellAmount: 0,
            keepCreatingPeriodDays: 1,
            keepCreatingQuests: 'RUTHER'
        }
        const invInvestor = {
            ...invGen,
            dailySpawnProbability: 100,
            invGenAlias: 'TWODAY',
            invGenName: 'Investor',
            buySellPeriodDays: 1,
            buyGainersFrequency: 30,
            swapIncFrequency: 7,
            swapDecFrequency: 7,
            excludeSingleName: 'AGORA'
        }
        const questModule = {
            ...questGen,
            questGenAlias: 'RUTHER',
            questGenName: 'Ruther',
            citeSingleName: 'AGORA'
        }

        const creator = Modules.Investor.create('creator', 'creator', 10000000, true)
        const fndQuest = creator.createQuest('AGORA')
        const fndPool = fndQuest.createPool()
        const [totalIn, totalOut] = fndPool.buy(555555)
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
            [],
            performanceTest
        )

        let dayPerf = []
        const genDays = 6
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
        }

        const missingTokens = getTotalMissingTokens()
        console.log(missingTokens)

        globalState.pools = genManager.getPools()
        globalState.quests = genManager.getQuests()
        globalState.investors = genManager.getInvestors()

        console.log(`Days performance`)
        console.table(dayPerf)

        console.table(
            Object.entries(genManager.getOpsTime())
                .map((ot) => ({
                    f: ot[0],
                    t: ot[1].time,
                    o: ot[1].ops
                }))
                .sort((a, b) => b.t - a.t)
        )

        console.table(
            globalState.investors
                .map((inv) => ({
                    name: inv.name,
                    usdc: inv.balances.USDC,
                    nav: Object.entries(inv.balances).reduce(
                        (acc, curr) =>
                            curr[0] === 'USDC'
                                ? acc + inv.balances.USDC
                                : acc +
                                  globalState.pools.find(
                                      (p) =>
                                          p.isQuest() &&
                                          p.tokenRight === curr[0]
                                  ).curPrice *
                                      curr[1],
                        0
                    ),
                    initial: inv.initialBalance
                }))
                .sort((a, b) =>
                    a.name > b.name ? 1 : b.name > a.name ? -1 : 0
                )
        )

        console.table(
            globalState.quests.map((q) => ({
                name: q.name,
                pools: q.pools.length
            }))
        )

        console.table(
            globalState.pools
                .map(
                    (p) =>
                        p.isQuest() && {
                            name: p.name,
                            curp: p.curPrice.toFixed(2),
                            mcap: p.getMarketCap(),
                            tvl: p.getTVL()
                        }
                )
                .filter((x) => x)
        )
    })
})

it('Generates quests', () => {})

it('Generates pools', () => {})

it('Generates cross pools', () => {})

it('Generates cites quests', () => {})
