import { faker } from '@faker-js/faker'

import Investor from '../../logic/Investor/Investor.class'
import UsdcToken from '../../logic/Quest/UsdcToken.class'
import globalConfig from '../../logic/config.global.json'

export const preparePool = (
    initialSum = 35000,
    investorType = 'creator',
    initialPositions
) => {
    if (!initialPositions) {
        initialPositions = globalConfig.INITIAL_LIQUIDITY
    }

    const name = faker.word.adjective()
    const investor = Investor.create(investorType, name, initialSum)
    const tokenRight = investor.createQuest('RP1')
    const tokenLeft = new UsdcToken()
    const pool = tokenRight.createPool({ tokenLeft, initialPositions })

    return { pool, investor, tokenLeft, tokenRight }
}

export const prepareCrossPools = (defaultTokenASum) => {
    const name = faker.word.adjective()
    const creator = Investor.create('creator', name, 10000)
    const quests = []

    // USDC Pools
    const questA = creator.createQuest('AGORA_A')
    const poolA = questA.createPool() // Deposit A
    quests.push(questA)
    quests.push(new UsdcToken())

    const questB = creator.createQuest('AGORA_B')
    const poolB = questB.createPool() // Deposit B
    quests.push(questB)

    const questC = creator.createQuest('AGORA_C')
    const poolC = questC.createPool() // Deposit C
    quests.push(questC)

    const questD = creator.createQuest('AGORA_D')
    const poolD = questD.createPool() // Deposit D
    quests.push(questD)

    const questE = creator.createQuest('AGORA_E')
    const poolE = questE.createPool() // Deposit E
    quests.push(questE)

    // [A,B]
    const AB = creator.createPool(questB, questA)
    const {
        min: pmin1,
        max: pmax1,
        native: native1
    } = creator.calculatePriceRange(AB, poolA, poolB)
    questA.addPool(AB)
    questB.addPool(AB)
    creator.citeQuest(AB, pmin1, pmax1, 0, defaultTokenASum, native1) // deposit A (citing)

    // [C,A]
    const CA = creator.createPool(questA, questC)
    const {
        min: pmin2,
        max: pmax2,
        native: native2
    } = creator.calculatePriceRange(CA, poolA, poolC)
    questA.addPool(CA)
    questC.addPool(CA)
    creator.citeQuest(CA, pmin2, pmax2, 0, defaultTokenASum, native2) // deposit C (citing)

    // [C,B]
    const CB = creator.createPool(questC, questB)
    const {
        min: pmin3,
        max: pmax3,
        native: native3
    } = creator.calculatePriceRange(CB, poolC, poolB)
    questB.addPool(CB)
    questC.addPool(CB)
    creator.citeQuest(CB, pmin3, pmax3, 0, defaultTokenASum, native3) // deposit B (citing)

    // [C,E]
    const CE = creator.createPool(questE, questC)
    const {
        min: pmin4,
        max: pmax4,
        native: native4
    } = creator.calculatePriceRange(CE, poolE, poolC)
    questC.addPool(CE)
    questE.addPool(CE)
    creator.citeQuest(CE, pmin4, pmax4, 0, defaultTokenASum, native4) // deposit C (citing)

    // [D,A]
    const DA = creator.createPool(questD, questA)
    const {
        min: pmin5,
        max: pmax5,
        native: native5
    } = creator.calculatePriceRange(DA, poolD, poolA)
    questA.addPool(DA)
    questD.addPool(DA)
    creator.citeQuest(DA, pmin5, pmax5, 0, defaultTokenASum, native5) // deposit A (citing)

    // [D,E]
    const DE = creator.createPool(questE, questD)
    const {
        min: pmin6,
        max: pmax6,
        native: native6
    } = creator.calculatePriceRange(DE, poolE, poolD)
    questD.addPool(DE)
    questE.addPool(DE)
    creator.citeQuest(DE, pmin6, pmax6, 0, defaultTokenASum, native6) // deposit D (citing)

    // [D,C]
    const DC = creator.createPool(questC, questD)
    const {
        min: pmin7,
        max: pmax7,
        native: native7
    } = creator.calculatePriceRange(DC, poolC, poolD)
    questC.addPool(DC)
    questD.addPool(DC)
    creator.citeQuest(DC, pmin7, pmax7, 0, defaultTokenASum, native7) // deposit D (citing)

    // [E,B]
    const EB = creator.createPool(questB, questE)
    const {
        min: pmin8,
        max: pmax8,
        native: native8
    } = creator.calculatePriceRange(EB, poolB, poolE)
    questB.addPool(EB)
    questE.addPool(EB)
    creator.citeQuest(EB, pmin8, pmax8, 0, defaultTokenASum, native8) // deposit E (citing)

    return [
        quests,
        {
            poolA,
            poolB,
            poolC,
            poolD,
            poolE,
            AB,
            CA,
            CB,
            CE,
            DA,
            DE,
            DC,
            EB
        }
    ]
}
