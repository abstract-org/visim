export const invGen = {
    invGenAlias: 'Type A',
    invGenName: '',
    createQuest: '',
    keepCreatingQuests: '',
    keepCreatingPeriodDays: 0,
    dailySpawnProbability: 50,
    initialBalance: 10000,
    buySellPeriodDays: 0,
    buyGainersFrequency: 30,
    excludeSingleName: '',
    includeSingleName: '',
    buySinglePerc: 0,
    buySumPerc: 10,
    buyQuestPerc: 50,
    buyGainerPerc: 20,
    swapIncFrequency: 7,
    swapDecFrequency: 7,
    swapIncDir: 'sell',
    swapIncSumPerc: 20,
    swapIncByPerc: 10,
    swapDecDir: 'sell',
    swapDecSumPerc: 5,
    sellDecByPerc: 10,
    valueSellPeriodDays: 0,
    valueSellAmount: 0,
    smartRouteDepth: 3
}

export const questGen = {
    questGenAlias: 'Type Q',
    questGenName: '',
    initialAuthorInvest: 5000,
    startingPrice: 1,
    citeSingleName: '',
    probCiteSingle: 90,
    singleCitePerc: 2,
    citeSingleMultiplier: 2,
    probRandomCite: 500,
    randomCitePerc: 5,
    citeRandomMultiplier: 2
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
