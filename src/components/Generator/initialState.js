export const invGen = {
    globalSwapThreshold: 100,

    dailySpawnProbability: 50,

    invGenAlias: 'Type A',
    invGenName: '',
    initialBalance: 10000,

    buySellPeriodDays: 0,

    buySinglePerc: 0,
    includeSingleName: '',

    buySumPerc: 10,
    buyQuestPerc: 50,
    buyGainerPerc: 20,
    buyGainersFrequency: 30,

    buySingleAmount: 0,
    buySumAmount: 0,
    swapIncSumAmount: 0,
    swapDecSumAmount: 0,

    excludeSingleName: '',

    swapIncFrequency: 7,
    swapIncDir: 'sell',
    swapIncSumPerc: 20,
    swapIncByPerc: 10,

    swapDecFrequency: 7,
    swapDecDir: 'sell',
    swapDecSumPerc: 5,
    swapDecByPerc: 10,

    createQuest: '',

    keepCreatingQuests: '',
    keepCreatingPeriodDays: 0,

    keepCitingProbability: 10,
    keepCitingSumPercentage: 30,
    keepCitingPriceHigherThan: 50,
    keepCitingPosMultiplier: 2,

    valueSellPeriodDays: 0,
    valueSellAmount: 0,
    valueSellPerc: 0,

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
    citeRandomMultiplier: 2,
    citeRandomPreferOwn: false
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
