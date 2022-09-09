export const invGen = {
    invGenAlias: 'Type A',
    createQuest: '',
    dailySpawnProbability: 50,
    initialBalance: 10000,
    buySellPeriodDays: 30,
    buySumPerc: 0,
    buyQuestPerc: 0,
    buyGainerPerc: 0,
    sellIncSumPerc: 0,
    sellDecSumPerc: 0,
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
