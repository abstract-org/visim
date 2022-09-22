export const invGen = {
    invGenAlias: 'Type A',
    invGenName: '',
    createQuest: '',
    keepCreatingQuests: '',
    keepCreatingPeriodDays: 0,
    dailySpawnProbability: 50,
    initialBalance: 10000,
    buySellPeriodDays: 0,
    excludeSingleName: '',
    includeSingleName: '',
    buySinglePerc: 0,
    buySumPerc: 10,
    buyQuestPerc: 50,
    buyGainerPerc: 20,
    sellIncSumPerc: 20,
    sellIncByPerc: 10,
    sellDecSumPerc: 5,
    sellDecByPerc: 10,
    valueSellPeriodDays: 0,
    valueSellAmount: 0
}

export const questGen = {
    questGenAlias: 'Type Q',
    questGenName: '',
    initialAuthorInvest: 5000,
    poolSizeTokens: 20000,
    startingPrice: 1,
    citeSingleName: '',
    probCiteSingle: 90,
    singleCitePerc: 2,
    probOtherCite: 500,
    otherCitePerc: 5
}

export const dayData = {
    investors: [],
    quests: [],
    pools: [],
    actions: [],
    questProbs: {
        citeSingle: false,
        citeOther: false,
        citeOtherAmount: 0
    },
    invProbs: {
        spawnInv: false,
        spawnInvAmount: 0
    }
}
