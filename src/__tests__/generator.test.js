import HashMap from 'hashmap'

import Generator from '../logic/Generators/Generator.class'
import { invGen, questGen } from '../logic/Generators/initialState'
import Investor from '../logic/Investor/Investor.class'

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

it('Generates investors', async () => {
    const invAuthor = {
        ...invGen,
        invGenAlias: 'AUTHOR',
        invGenName: 'Researchers',
        createQuest: 'AGRA',
        valueSellPeriodDays: 10,
        valueSellAmount: 5000,
        keepCreatingPeriodDays: 11,
        keepCreatingQuests: 'AGRA'
    }
    const invInvestor = {
        ...invGen,
        invGenAlias: 'TWODAY',
        invGenName: 'Twodays',
        buySellPeriodDays: 3,
        buyGainersFrequency: 10,
        includeSingleName: 'AGORA',
        buySinglePerc: 5,
        swapDecFrequency: 2,
        swapIncFrequency: 3
    }
    const invInvestor2 = {
        ...invGen,
        invGenAlias: 'THREEDAY',
        invGenName: 'Threedays',
        buySellPeriodDays: 3,
        buyGainersFrequency: 5
    }
    const queAuthor = {
        ...questGen,
        questGenAlias: 'AGRA',
        questGenName: 'Athletics',
        citeSingleName: 'AGORA',
        citeSingleMultiplier: 3
    }

    const creator = Investor.create('creator', 'creator', 10000)
    const fndQuest = creator.createQuest('AGORA')
    const fndPool = fndQuest.createPool()
    globalState.quests.set(fndQuest.name, fndQuest)
    globalState.pools.set(fndPool.name, fndPool)

    const performanceTest = true
    const genManager = new Generator(
        [invAuthor, invInvestor, invInvestor2],
        [queAuthor],
        globalState.pools,
        globalState.quests,
        performanceTest
    )

    let dayPerf = []

    const tot0 = performance.now()

    const genDays = 30
    for (let day = 1; day <= genDays; day++) {
        console.log(`Simulating day ${day}`)
        const d0 = performance.now()
        await genManager.step(day)
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

    console.table(genManager.getOpsTime())

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
