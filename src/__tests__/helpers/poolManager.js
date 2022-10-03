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
    const investor = new Investor(investorType, name, initialSum)
    const tokenRight = investor.createQuest('RP1')
    const tokenLeft = new UsdcToken()
    const pool = tokenRight.createPool({ tokenLeft, initialPositions })

    return { pool, investor, tokenLeft, tokenRight }
}

export const prepareCrossPools = (defaultTokenASum) => {
    const name = faker.word.adjective()
    const creator = new Investor('creator', name, 10000)
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
    const { min: pmin1, max: pmax1 } = creator.calculatePriceRange(poolB, poolA)
    const AB = creator.createPool(questB, questA)
    creator.citeQuest(AB, questB, questA, pmin1, pmax1, defaultTokenASum, 0) // deposit A (citing)

    // [C,A]
    const { min: pmin2, max: pmax2 } = creator.calculatePriceRange(poolC, poolA)
    const CA = creator.createPool(questA, questC)
    creator.citeQuest(CA, questA, questC, pmin2, pmax2, defaultTokenASum, 0) // deposit C (citing)

    // [C,B]
    const { min: pmin3, max: pmax3 } = creator.calculatePriceRange(poolB, poolC)
    const CB = creator.createPool(questC, questB)
    creator.citeQuest(CB, questC, questB, pmin3, pmax3, defaultTokenASum, 0) // deposit B (citing)

    // [C,E]
    const { min: pmin4, max: pmax4 } = creator.calculatePriceRange(poolC, poolE)
    const CE = creator.createPool(questE, questC)
    creator.citeQuest(CE, questE, questC, pmin4, pmax4, defaultTokenASum, 0) // deposit C (citing)

    // [A,D]
    const { min: pmin5, max: pmax5 } = creator.calculatePriceRange(poolA, poolD)
    const AD = creator.createPool(questD, questA)
    creator.citeQuest(AD, questD, questA, pmin5, pmax5, defaultTokenASum, 0) // deposit A (citing)

    // [D,E]
    const { min: pmin6, max: pmax6 } = creator.calculatePriceRange(poolD, poolE)
    const DE = creator.createPool(questE, questD)
    creator.citeQuest(DE, questE, questD, pmin6, pmax6, defaultTokenASum, 0) // deposit D (citing)

    // [D,C]
    const { min: pmin7, max: pmax7 } = creator.calculatePriceRange(poolD, poolC)
    const DC = creator.createPool(questC, questD)
    creator.citeQuest(DC, questC, questD, pmin7, pmax7, defaultTokenASum, 0) // deposit D (citing)

    // [E,B]
    const { min: pmin8, max: pmax8 } = creator.calculatePriceRange(poolE, poolB)
    const EB = creator.createPool(questB, questE)
    creator.citeQuest(EB, questB, questE, pmin8, pmax8, defaultTokenASum, 0) // deposit E (citing)

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
            AD,
            DE,
            DC,
            EB
        }
    ]
}
