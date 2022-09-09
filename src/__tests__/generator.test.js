import HashMap from 'hashmap'

import Generator from '../logic/Generators/Generator.class'
import { invGen, questGen } from '../logic/Generators/initialState'

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
    const newInv = { ...invGen }
    newInv.createQuest = questGen.questGenAlias
    const genManager = new Generator([newInv], [questGen])

    for (let day = 1; day <= genDays; day++) {
        console.log(`Simulating day ${day}`)
        await genManager.step(day)
    }

    globalState.pools = genManager.getPools()
    globalState.quests = genManager.getQuests()
    globalState.investors = genManager.getInvestors()
})

it('Generates quests', () => {})

it('Generates pools', () => {})

it('Generates cross pools', () => {})

it('Generates cites quests', () => {})
