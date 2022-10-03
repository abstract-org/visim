import HashMap from 'hashmap'

import Generator from '../logic/Generators/Generator.class'
import { invGen, questGen } from '../logic/Generators/initialState'
import Investor from '../logic/Investor/Investor.class'

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

fit('Generates investors', async () => {
    const invAuthor = {
        ...invGen,
        invGenAlias: 'AUTHOR',
        invGenName: 'Researchers',
        createQuest: 'AGRA',
        valueSellEveryDays: 7
    }
    const inv2Author = {
        ...invGen,
        invGenAlias: 'RESEARCHER',
        invGenName: 'Authors',
        createQuest: 'QTEST',
        valueSellEveryDays: 10,
        excludeSingleName: 'AGORA'
    }
    const invInvestor = {
        ...invGen,
        invGenAlias: 'TWODAY',
        invGenName: 'Twodays',
        buySellPeriodDays: 2,
        buyGainerPerc: 30,
        buyQuestPerc: 100,
        initialBalance: 20000,
        sellIncSumPerc: 10,
        sellDecSumPerc: 20,
        excludeSingleName: 'AGORA'
    }
    const invInvestorWeekly = {
        ...invGen,
        buySellPeriodDays: 5,
        buyQuestPerc: 80,
        buyGainerPerc: 45,
        invGenAlias: 'WEEKLY',
        invGenName: 'Weeklies',
        initialBalance: 50000,
        sellIncSumPerc: 5,
        sellDecSumPerc: 30,
        includeSingleName: 'AGORA',
        buySinglePerc: 10
    }
    const queAuthor = {
        ...questGen,
        questGenAlias: 'QTEST',
        questGenName: 'Cookie'
    }
    const que2Author = {
        ...questGen,
        questGenAlias: 'AGRA',
        questGenName: 'Agorka'
    }

    const creator = new Investor('creator', 'creator', 10000)
    const fndQuest = creator.createQuest('AGORA')
    const fndPool = fndQuest.createPool()
    globalState.quests.set(fndQuest.name, fndQuest)
    globalState.pools.set(fndPool.name, fndPool)

    const genManager = new Generator(
        [invAuthor, inv2Author, invInvestor, invInvestorWeekly],
        [queAuthor, que2Author],
        globalState.pools.values(),
        globalState.quests.values()
    )

    let dayPerf = []

    const genDays = 5
    for (let day = 1; day <= genDays; day++) {
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

    globalState.pools = genManager.getPools()
    globalState.quests = genManager.getQuests()
    globalState.investors = genManager.getInvestors()

    console.log(`||| TOTAL TRADING OPERATIONS: ${genManager.getOps()} |||`)
    console.log(`Days performance`)
    console.table(dayPerf)

    // console.log(
    //     'gen output:',
    //     'pools:',
    //     globalState.pools.length,
    //     'invs:',
    //     globalState.investors.length,
    //     'quests:',
    //     globalState.quests.length
    // )

    // const poolPrices = []
    // globalState.pools.forEach((pool) => {
    //     poolPrices.push({
    //         name: pool.name,
    //         price: pool.currentPrice
    //     })
    // })
    // console.table(poolPrices)

    // const investorBalances = []
    // globalState.investors.forEach((investor) => {
    //     investorBalances.push({
    //         name: investor.type,
    //         balances: JSON.stringify(investor.balances)
    //     })
    // })
    // console.table(investorBalances)
})

it('Generates quests', () => {})

it('Generates pools', () => {})

it('Generates cross pools', () => {})

it('Generates cites quests', () => {})
