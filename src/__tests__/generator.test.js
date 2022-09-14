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

it('Generates investors', async () => {
    const genDays = 10
    const invAuthor = {
        ...invGen,
        invGenAlias: 'AUTHOR',
        createQuest: 'QTEST',
        valueSellEveryDays: 7
    }
    const inv2Author = {
        ...invGen,
        invGenAlias: 'RESEARCHER',
        createQuest: 'ARGL',
        valueSellEveryDays: 10,
        excludeSingleName: 'AGORA'
    }
    const invInvestor = {
        ...invGen,
        invGenAlias: 'TWODAY',
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
        initialBalance: 50000,
        sellIncSumPerc: 5,
        sellDecSumPerc: 30
    }
    const queAuthor = { ...questGen, questGenAlias: 'QTEST' }
    const que2Author = { ...questGen, questGenAlias: 'ARGL' }
    const daysData = []

    const creator = new Investor(1, 10000, 'creator')
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

    for (let day = 1; day <= genDays; day++) {
        console.log(`Simulating day ${day}`)
        const dayData = await genManager.step(day)
        daysData.push(dayData)
    }

    globalState.pools = genManager.getPools()
    globalState.quests = genManager.getQuests()
    globalState.investors = genManager.getInvestors()

    console.log(
        'gen output:',
        'pools:',
        globalState.pools.length,
        'invs:',
        globalState.investors.length,
        'quests:',
        globalState.quests.length,
        'swaps:',
        genManager.getSmartSwaps().length
    )

    const poolPrices = []
    globalState.pools.forEach((pool) => {
        poolPrices.push({
            name: pool.name,
            price: pool.currentPrice
        })
    })
    console.table(poolPrices)

    const investorBalances = []
    globalState.investors.forEach((investor) => {
        investorBalances.push({
            name: investor.type,
            balances: JSON.stringify(investor.balances)
        })
    })
    console.table(investorBalances)
})

it('Generates quests', () => {})

it('Generates pools', () => {})

it('Generates cross pools', () => {})

it('Generates cites quests', () => {})
