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

    const investor = new Investor(1, initialSum, investorType)
    const tokenRight = investor.createQuest('RP1')
    const tokenLeft = new UsdcToken()
    const pool = tokenRight.createPool({ tokenLeft, initialPositions })

    return { pool, investor, tokenLeft, tokenRight }
}

export const prepareCrossPools = (priceMin, priceMax, defaultTokenASum) => {
    const creator = new Investor(1, 10000, 'creator')
    const quests = []

    // USDC Pools
    const questA = creator.createQuest('AGORA_A')
    const poolA = questA.createPool() // Deposit A
    quests.push(questA)

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
    const AB = creator.createPool(questA, questB)
    creator.citeQuest(AB, priceMin, priceMax, 0, defaultTokenASum) // deposit A (citing)

    // [C,A]
    const CA = creator.createPool(questC, questA)
    creator.citeQuest(CA, priceMin, priceMax, defaultTokenASum, 0) // deposit C (citing)

    // [C,B]
    const CB = creator.createPool(questC, questB)
    creator.citeQuest(CB, priceMin, priceMax, defaultTokenASum, 0) // deposit C (citing)

    // [C,E]
    const CE = creator.createPool(questC, questE)
    creator.citeQuest(CE, priceMin, priceMax, defaultTokenASum, 0) // deposit C (citing)

    // [A,D]
    const AD = creator.createPool(questA, questD)
    creator.citeQuest(AD, priceMin, priceMax, defaultTokenASum, 0) // deposit A (citing)

    // [D,E]
    const DE = creator.createPool(questD, questE)
    creator.citeQuest(DE, priceMin, priceMax, defaultTokenASum, 0) // deposit D (citing)

    // [D,C]
    const DC = creator.createPool(questD, questC)
    creator.citeQuest(DC, priceMin, priceMax, defaultTokenASum, 0) // deposit D (citing)

    // [E,B]
    const EB = creator.createPool(questE, questB)
    creator.citeQuest(EB, priceMin, priceMax, defaultTokenASum, 0) // deposit E (citing)

    return [
        quests,
        { poolA, poolB, poolC, poolD, poolE, AB, CA, CB, CE, AD, DE, DC, EB }
    ]
}
