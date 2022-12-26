import Joi from 'joi'

// generatorStore: { invConfigs: [], questConfigs: [] },
const generatorStoreSchema = Joi.object().keys({
    invConfigs: Joi.array().items({
        dailySpawnProbability: Joi.any(),
        invGenAlias: Joi.any(),
        invGenName: Joi.any(),
        initialBalance: Joi.any(),
        buySellPeriodDays: Joi.any(),
        buySinglePerc: Joi.any(),
        includeSingleName: Joi.any(),
        buySumPerc: Joi.any(),
        buyQuestPerc: Joi.any(),
        buyGainerPerc: Joi.any(),
        buyGainersFrequency: Joi.any(),
        excludeSingleName: Joi.any(),
        swapIncFrequency: Joi.any(),
        swapIncDir: Joi.any(),
        swapIncSumPerc: Joi.any(),
        swapIncByPerc: Joi.any(),
        swapDecFrequency: Joi.any(),
        swapDecDir: Joi.any(),
        swapDecSumPerc: Joi.any(),
        swapDecByPerc: Joi.any(),
        createQuest: Joi.any(),
        keepCreatingQuests: Joi.any(),
        keepCreatingPeriodDays: Joi.any(),
        keepCitingProbability: Joi.any(),
        keepCitingSumPercentage: Joi.any(),
        keepCitingPriceHigherThan: Joi.any(),
        keepCitingPosMultiplier: Joi.any(),
        valueSellPeriodDays: Joi.any(),
        valueSellAmount: Joi.any(),
        smartRouteDepth: Joi.any()
    }),
    questConfigs: Joi.array().items({
        questGenAlias: Joi.string(),
        questGenName: Joi.string(),
        initialAuthorInvest: Joi.number(),
        startingPrice: Joi.number(),
        citeSingleName: Joi.string(),
        probCiteSingle: Joi.string(),
        singleCitePerc: Joi.number(),
        citeSingleMultiplier: Joi.number(),
        probRandomCite: Joi.number(),
        randomCitePerc: Joi.number(),
        citeRandomMultiplier: Joi.number(),
        citeRandomPreferOwn: Joi.number()
    })
})

// investorStore: { investors: [] },
const investorStoreSchema = Joi.object().keys({
    investors: Joi.array().items(Joi.string())
})

const getHashmapSchema = (valueType) =>
    Joi.object().keys({
        size: Joi.number(),
        _data: Joi.array().items(
            Joi.string(),
            Joi.array().items(
                Joi.object().custom((value, helper) => {
                    if (value instanceof valueType) {
                        return true
                    } else {
                        return helper.message({
                            [value]: `HashMap value is not valid instance of class ${valueType}`
                        })
                    }
                })
                // Joi.custom(() => true)
            )
        )
    })

// investors: new HashMap(),
const investorsSchema = Joi.array().items(getHashmapSchema())

// logStore: { logObjs: [] },
const logStoreSchema = Joi.object().keys({
    logObjs: Joi.array().items({
        //
    })
})

// poolStore: {
//     pools: [] /* pool names */,
//     swaps: [],
//     active: '' /* active pool*/,
//     swapMode: 'smart'
// },
const poolStoreSchema = Joi.object().keys({
    pools: Joi.array().items(Joi.string()),
    swaps: Joi.array(),
    active: Joi.string(),
    swapMode: Joi.string()
})

export const DEFAULT_SCHEMA = Joi.object().keys({
    generatorStore: generatorStoreSchema,
    investorStore: investorStoreSchema,
    investors: investorsSchema,
    logStore: logStoreSchema,
    poolStore: poolStoreSchema,
    pools: Joi.any(),
    questStore: Joi.any(),
    quests: Joi.any(),
    dayTrackerStore: Joi.any(),
    moneyDist: Joi.any()

    // quests: new HashMap(),
    // /* not ready yet */
    // dayTrackerStore: { currentDay: 0 },
    // moneyDist: {
    //     citing: [],
    //     buying: [],
    //     selling: [],
    //     buyingSmart: [],
    //     sellingSmart: []
    // }
})

// example:
// title: Joi.string().alphanum().min(3).max(30).required(),
// description: Joi.string(),
// comments: Joi.array().items(
//     Joi.object.keys({
//         description: Joi.string(),
//         author: Joi.string().required(),
//         grade: Joi.number().min(1).max(5)
//     })
// )
// var nestedSchema = joi.object().keys({
//     b: joi.number()
// });
//
// var base = joi.object({
//     a: joi.string(),
//     nestedData: nestedSchema
// });
