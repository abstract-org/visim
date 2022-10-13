import HashMap from 'hashmap'

import Generator from '../logic/Generators/Generator.class'
import { invGen, questGen } from '../logic/Generators/initialState'
import tradeTopGainers from '../logic/Generators/threads/master'
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
        valueSellEveryDays: 0,
        keepCreatingPeriodDays: 1,
        keepCreatingQuests: 'AGRA'
    }
    const invInvestor = {
        ...invGen,
        invGenAlias: 'TWODAY',
        invGenName: 'Twodays',
        buySellPeriodDays: 2,
        buyGainersFrequency: 4,
        swapIncDir: 'buy'
    }
    const invInvestor2 = {
        ...invGen,
        invGenAlias: 'THREEDAY',
        invGenName: 'Threedays',
        buySellPeriodDays: 2,
        buyGainersFrequency: 4
    }
    const queAuthor = {
        ...questGen,
        questGenAlias: 'AGRA',
        questGenName: 'Cookie'
    }

    const creator = Investor.create('creator', 'creator', 10000)
    const fndQuest = creator.createQuest('AGORA')
    const fndPool = fndQuest.createPool()
    globalState.quests.set(fndQuest.name, fndQuest)
    globalState.pools.set(fndPool.name, fndPool)

    const genManager = new Generator(
        [invAuthor, invInvestor, invInvestor2],
        [queAuthor],
        globalState.pools,
        globalState.quests
    )

    let dayPerf = []

    const genDays = 4
    for (let day = 1; day <= genDays; day++) {
        console.log(`Simulating day ${day}`)
        const d0 = performance.now()
        await genManager.step(day)
        const d1 = performance.now()
        console.log(`Day ${day} simulated, took`)
        //console.log(genManager.getOpsTime())
        const totalTradingTime = Object.entries(genManager.getOpsTime())
            .map((p) => p[1].time)
            .reduce((p, a) => p + a, 0)

        const daySec = d1 - d0 >= 1000 ? true : false
        dayPerf.push({
            day,
            ms: !daySec ? `${(d1 - d0).toFixed(2)}ms` : null,
            sec: daySec ? `${((d1 - d0) / 1000).toFixed(2)}sec` : null,
            nonTrade: `${((d1 - d0 + totalTradingTime) / 1000).toFixed(2)}sec`
        })
    }

    globalState.pools = genManager.getPools()
    globalState.quests = genManager.getQuests()
    globalState.investors = genManager.getInvestors()

    console.log(`||| TOTAL TRADING OPERATIONS: ${genManager.getOps()} |||`)
    console.log(`Days performance`)
    console.table(dayPerf)
})

it('Generates quests', () => {})

it('Generates pools', () => {})

it('Generates cross pools', () => {})

it('Generates cites quests', () => {})

fit('Runs trading in parallel workers', async () => {})
