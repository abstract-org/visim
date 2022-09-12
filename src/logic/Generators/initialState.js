export const invGen = {
    invGenAlias: 'Type A',
    createQuest: '',
    dailySpawnProbability: 50,
    initialBalance: 10000,
    buySellPeriodDays: 0,
    buySumPerc: 10,
    buyQuestPerc: 50,
    buyGainerPerc: 20,
    sellIncSumPerc: 20,
    sellDecSumPerc: 5,
    valueSellEveryDays: 30,
    valueSellAmount: 5000
}

export const questGen = {
    questGenAlias: 'Type S',
    initialAuthorInvest: 5000,
    poolSizeTokens: 20000,
    startingPrice: 1,
    probCiteAgora: 90,
    agoraCitePerc: 2,
    probOtherCite: 500,
    otherCitePerc: 5
}

export const dayData = {
    investors: [],
    quests: [],
    pools: [],
    questProbs: {
        citeAgora: false,
        citeOther: false,
        citeOtherAmount: 0
    },
    invProbs: {
        spawnInv: false,
        spawnInvAmount: 0
    }
}
