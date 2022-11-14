import Chance from 'chance'
import HashMap from 'hashmap'

import Investor from '../Investor/Investor.class'
import UsdcToken from '../Quest/UsdcToken.class'
import Router from '../Router/Router.class'
import {
    calcGrowthRate,
    formSwapData,
    getCombinedSwaps,
    isE10Zero,
    isNearZero,
    isZero,
    priceDiff
} from '../Utils/logicUtils'
import { totalMissingTokens, totalSingleMissingToken } from '../Utils/tokenCalc'

const _OPS_TIME_INITIAL = {
    simulateQuestCreation: { time: 0, ops: 0, timeStarted: 0 },
    addPeriodicInvestor: { time: 0, ops: 0, timeStarted: 0 },
    initializeQuest: { time: 0, ops: 0, timeStarted: 0 },
    initializeInvestor: { time: 0, ops: 0, timeStarted: 0 },
    initialInvestment: { time: 0, ops: 0, timeStarted: 0 },
    citeSingleQuest: { time: 0, ops: 0, timeStarted: 0 },
    citeRandomQuests: { time: 0, ops: 0, timeStarted: 0 },
    citeRandomWithPriceHigher: { time: 0, ops: 0, timeStarted: 0 },
    citeQuests: { time: 0, ops: 0, timeStarted: 0 },
    simulateKeepCreatingQuest: { time: 0, ops: 0, timeStarted: 0 },
    tradeSpecificQuest: { time: 0, ops: 0, timeStarted: 0 },
    tradeTopGainers: { time: 0, ops: 0, timeStarted: 0 },
    tradeIncQuests: { time: 0, ops: 0, timeStarted: 0 },
    tradeDecQuests: { time: 0, ops: 0, timeStarted: 0 },
    simulateTrade: { time: 0, ops: 0, timeStarted: 0 },
    smartSwapPools: { time: 0, ops: 0, timeStarted: 0 },
    simulateWithdraw: { time: 0, ops: 0, timeStarted: 0 },
    getChangedPriceQuests: { time: 0, ops: 0, timeStarted: 0 },
    getTradePools: { time: 0, ops: 0, timeStarted: 0 },
    getTopGainers: { time: 0, ops: 0, timeStarted: 0 },
    getRandomGainers: { time: 0, ops: 0, timeStarted: 0 },
    calculateCiteAmount: { time: 0, ops: 0, timeStarted: 0 },
    spawnInvestor: { time: 0, ops: 0, timeStarted: 0 },
    spawnQuest: { time: 0, ops: 0, timeStarted: 0 },
    calculateQuestProbabilities: { time: 0, ops: 0, timeStarted: 0 },
    calcProb: { time: 0, ops: 0, timeStarted: 0 },
    calculateInvProbabilities: { time: 0, ops: 0, timeStarted: 0 },
    storeTradedPool: { time: 0, ops: 0, timeStarted: 0 },
    processSwapData: { time: 0, ops: 0, timeStarted: 0 },
    getRandomElements: { time: 0, ops: 0, timeStarted: 0 }
}

class Generator {
    #invConfigs = []
    #questConfigs = []
    #chance = null
    _dayData = {}
    _cachedInvestors = new HashMap()
    _cachedQuests = new HashMap()
    _cachedPools = new HashMap()
    #dailyTradedPools = []

    #DEFAULT_TOKEN = 'USDC'
    #_OPS_TIME = _OPS_TIME_INITIAL
    #_PERFORMANCE = false

    keepCreatingInvs = {}
    tradingInvs = {}
    sellValueInvs = {}

    router
    handlers = []
    tradingHandlers = []

    constructor(
        invConfigs,
        questConfigs,
        globalPools,
        globalQuests,
        globalInvestors,
        swaps = [],
        performance,
        performanceOutput
    ) {
        this.#chance = Chance()

        this.#invConfigs = invConfigs
        this.#questConfigs = questConfigs
        this._cachedQuests = globalQuests.clone()
        this._cachedPools = globalPools.clone()

        globalInvestors.values().forEach((investor) => {
            if (!investor.default) {
                this._cachedInvestors.set(investor.hash, investor)
            }
        })

        this.router = new Router(this._cachedQuests, this._cachedPools)

        this.#_PERFORMANCE = performance

        if (swaps.length) {
            swaps.forEach((swap) => {
                const pool = this._cachedPools.get(swap.pool)
                if (pool.isQuest()) {
                    this.storeTradedPool(swap.day, pool)
                }
            })
        }
    }

    measure(funcName, endMeasure) {
        if (!this.#_PERFORMANCE) return

        if (!this.#_OPS_TIME[funcName]) {
            console.log(funcName)
        }
        if (!endMeasure) {
            this.#_OPS_TIME[funcName].ops++
            const time = performance.now()
            this.#_OPS_TIME[funcName].timeStart = time
        } else {
            const time = performance.now()
            this.#_OPS_TIME[funcName].time +=
                time - this.#_OPS_TIME[funcName].timeStart
            this.#_OPS_TIME[funcName].timeStart = 0
        }
    }

    async step(day) {
        this._dayData[day] = {
            investors: [],
            quests: [],
            pools: [],
            actions: []
        }

        this.#invConfigs.forEach((conf) => {
            // Calculate probabilities
            const invProbs = this.calculateInvProbabilities(conf)

            // Generate investor with config by probability
            if (invProbs.spawnInv) {
                for (let i = 1; i <= invProbs.spawnInvQuantity; i++) {
                    const investor = this.initializeInvestor(conf, day)

                    const questType = conf.createQuest

                    if (questType) {
                        this.simulateQuestCreation(
                            investor,
                            day,
                            conf.createQuest
                        )
                    }

                    this._dayData[day]['investors'].push(investor)

                    // Keep creating quests every X days
                    this.addPeriodicInvestor(
                        investor,
                        conf,
                        'keepCreatingInvs',
                        'keepCreatingPeriodDays'
                    )

                    // Buy/sell investors every X days
                    this.addPeriodicInvestor(
                        investor,
                        conf,
                        'tradingInvs',
                        'buySellPeriodDays'
                    )

                    // Sell own value up to X every Y days
                    this.addPeriodicInvestor(
                        investor,
                        conf,
                        'sellValueInvs',
                        'valueSellPeriodDays'
                    )
                } // end of inv spawner loop
            } // end of inv spawner if
        })

        // Every X days - keep creating quests
        this.handlers.push(
            new Promise((resolve) => {
                resolve(this.simulateKeepCreatingQuest(day))
            })
        )
        //this.simulateKeepCreatingQuest(day)

        // Every X days - buy/sell top gainers/increased or decreased in prices
        this.handlers.push(
            new Promise((resolve) => {
                resolve(this.simulateTrade(day, this.router))
            })
        )
        //this.simulateTrade(day, this.router)

        // Every X days - withdraw X in USDC value
        this.handlers.push(
            new Promise((resolve) => {
                resolve(this.simulateWithdraw(day, this.router))
            })
        )
        //this.simulateWithdraw(day, this.router)

        await Promise.all(this.handlers).catch((reason) => {
            console.log(`Rejected promise: ${reason}`)
        })

        return this._dayData[day]
    }

    simulateQuestCreation(
        investor,
        day,
        questType,
        creationType = 'regular-creation'
    ) {
        this.measure('simulateQuestCreation')
        const questConfig = this.#questConfigs.find(
            (quest) => quest.questGenAlias === questType
        )

        // Do not create a new quest if not enough USDC for initial investment
        if (investor.balances.USDC < questConfig.initialAuthorInvest) {
            return
        }

        const questProbs = this.calculateQuestProbabilities(questConfig)

        const { pool, quest } = this.initializeQuest(questConfig, day, investor)

        this._cachedQuests.set(quest.name, quest)
        this._cachedPools.set(pool.name, pool)
        this._dayData[day]['pools'].push(pool)
        this._dayData[day]['quests'].push(quest)

        // Initial investment
        if (
            questConfig.initialAuthorInvest > 0 &&
            investor.balances[this.#DEFAULT_TOKEN] <
                questConfig.initialAuthorInvest
        ) {
            return
        }

        this.initialInvestment(
            questConfig.initialAuthorInvest,
            day,
            pool,
            quest,
            investor,
            creationType
        )

        // Static citation section (can be any selected quest, not just "Agora")
        if (questProbs.citeSingle && questConfig.citeSingleName) {
            this.citeSingleQuest(
                questConfig,
                day,
                pool,
                quest,
                investor,
                creationType
            )
        }

        if (questProbs.citeOther && questProbs.citeOtherQuantity > 0) {
            this.citeRandomQuests(
                questConfig,
                day,
                pool,
                quest,
                investor,
                questProbs,
                creationType
            )
        }

        this.measure('simulateQuestCreation', true)
    }

    addPeriodicInvestor(investor, conf, invType, periodInDays) {
        this.measure('addPeriodicInvestor')

        if (parseInt(conf[periodInDays]) > 0) {
            if (!this[invType][conf[periodInDays]]) {
                this[invType][conf[periodInDays]] = []
            }

            this[invType][conf[periodInDays]].push({
                investor,
                conf
            })
        }

        this.measure('addPeriodicInvestor', true)
    }

    initializeQuest(questConfig, day, investor) {
        this.measure('initializeQuest')

        // Generate quest by probability with config
        const questSum = this._cachedQuests.size
        const { pool, quest } = this.spawnQuest(
            investor,
            `${questConfig.questGenName} (${questSum + 1})`
        )
        this._dayData[day].actions.push({
            pool: pool.name,
            investorHash: investor.hash,
            action: 'CREATED',
            day
        })
        this._dayData[day].quests.push(quest)
        this._dayData[day].pools.push(pool)

        this.measure('initializeQuest', true)

        return { pool, quest }
    }

    initializeInvestor(invConfig, day) {
        this.measure('initializeInvestor')

        const invSum = this._cachedInvestors.size
        const investor = this.spawnInvestor(
            invConfig.invGenAlias,
            `${invConfig.invGenName} (${invSum + 1})`,
            invConfig.initialBalance
        )
        this._dayData[day].investors.push(investor)
        this._dayData[day].actions.push({
            investorHash: investor.hash,
            action: 'SPAWNED',
            day
        })

        this.measure('initializeInvestor', true)

        return investor
    }

    initialInvestment(amountIn, day, pool, quest, investor, creationType) {
        this.measure('initialInvestment')

        const [totalIn, totalOut] = pool.buy(amountIn)

        this._dayData[day].actions.push({
            pool: pool.name,
            price: pool.curPrice.toFixed(3),
            investorHash: investor.hash,
            action: 'BOUGHT',
            totalAmountIn: totalIn.toFixed(2),
            totalAmountOut: totalOut.toFixed(2),
            day,
            mcap: pool.getMarketCap(),
            tvl: pool.getTVL(),
            paths: pool.name,
            opName: `Initial investment of ${amountIn}`
        })
        this.storeTradedPool(day, pool)
        investor.addBalance(this.#DEFAULT_TOKEN, totalIn, 'initially investing')
        investor.addBalance(quest.name, totalOut, 'initially investing')

        this.measure('initialInvestment', true)
    }

    citeSingleQuest(
        questConfig,
        day,
        citingPool,
        citingQuest,
        investor,
        creationType
    ) {
        this.measure('citeSingleQuest')

        const singleQuest = this._cachedQuests.get(questConfig.citeSingleName)
        if (!singleQuest) {
            return
        }

        const citeSingleAmount = this.calculateCiteAmount(
            investor,
            citingQuest.name,
            questConfig.singleCitePerc
        )

        if (
            !citeSingleAmount ||
            typeof citeSingleAmount !== 'number' ||
            citeSingleAmount < 0
        ) {
            return
        }

        const pName = `${this.#DEFAULT_TOKEN}-${singleQuest.name}`
        if (!this._cachedPools.has(pName)) {
            return
        }

        const singleUsdcPool = this._cachedPools.get(pName)

        let crossPool = this._cachedPools.get(
            `${singleQuest.name}-${citingQuest.name}`
        )

        if (!crossPool) {
            const startingPrice = citingPool.curPrice / singleUsdcPool.curPrice
            crossPool = investor.createPool(
                singleQuest,
                citingQuest,
                startingPrice
            )
            this._dayData[day].actions.push({
                pool: crossPool.name,
                investorHash: investor.hash,
                action: 'CREATED',
                day
            })
            this._cachedPools.set(crossPool.name, crossPool)
        }

        const priceRange = investor.calculatePriceRange(
            crossPool,
            singleUsdcPool,
            citingPool,
            questConfig.citeSingleMultiplier
        )
        this._dayData[day].pools.push(crossPool)

        const citeAmount0 =
            crossPool.tokenLeft === singleQuest.name ? 0 : citeSingleAmount
        const citeAmount1 = citeAmount0 === 0 ? citeSingleAmount : 0

        const posBefore = [...crossPool.pos.values()]
        const totalInOut = investor.citeQuest(
            crossPool,
            priceRange.min,
            priceRange.max,
            citeAmount0,
            citeAmount1,
            priceRange.native
        )

        const posAfter = [...crossPool.pos.values()]

        if (
            posBefore.length === posAfter.length ||
            !totalInOut ||
            !Array.isArray(totalInOut) ||
            totalInOut.length < 2
        ) {
            console.warn('### ALERT: CITATION [' + day + ']###')
            console.warn(`Failed to cite ${crossPool.name}`)
            console.warn(priceRange, citeAmount0, citeAmount1)
            console.warn(citingPool, singleUsdcPool)
            return
        }

        const orgQuest = this._cachedQuests.get(citingQuest.name)
        const sinQuest = this._cachedQuests.get(singleQuest.name)
        orgQuest.addPool(crossPool)
        sinQuest.addPool(crossPool)
        this._cachedQuests.set(orgQuest.name, orgQuest)
        this._cachedQuests.set(sinQuest.name, sinQuest)

        this._dayData[day].actions.push({
            pool: crossPool.name,
            price: crossPool.curPrice.toFixed(3),
            investorHash: investor.hash,
            action: 'CITED',
            totalAmountIn: citeSingleAmount.toFixed(3),
            day,
            opName:
                Object.entries(priceRange)
                    .map((a) => `${a[0]}:${a[1]}\n`)
                    .join(', ') +
                ' // ' +
                totalInOut.join(',') +
                ' // ' +
                `Substract from ${citingQuest.name}, current balance: ${
                    investor.balances[citingQuest.name]
                } cross pool: ${crossPool.name} ${crossPool.type}`
        })

        investor.addBalance(
            citingQuest.name,
            -totalInOut[0],
            'citing single quest'
        )

        const curTokenMissing = totalSingleMissingToken(
            citingQuest.name,
            this._cachedQuests.values(),
            this._cachedPools.values(),
            this._cachedInvestors.values()
        )

        // @TODO: check current leak against preserved leak data
        // @TODO: (curTokenMissing - prevTokensLeakData[citingQuest.name].total) > 0
        if (curTokenMissing > 0 && !isZero(curTokenMissing)) {
            console.warn('### ALERT: CITATION #2 SINGLE [' + day + ']###')
            console.warn(
                `Despite all the correct actions, token ${citingQuest.name} went missing by ${curTokenMissing}`
            )
            console.warn(investor)
            console.warn(crossPool)
            console.warn(citingPool)
            console.warn(singleUsdcPool)

            investor.addBalance(
                citingQuest.name,
                curTokenMissing,
                'Reimbursement for failed citation of a single quest'
            )

            // @TODO: breakpoint here and try trace citeSingleQuest
            // const totalInOut = investor.citeQuest(
            //     crossPool,
            //     priceRange.min,
            //     priceRange.max,
            //     citeAmount0,
            //     citeAmount1,
            //     priceRange.native
            // )
        }

        this._dayData[day]['pools'].push(crossPool)

        this.measure('citeSingleQuest', true)
    }

    citeRandomQuests(
        questConfig,
        day,
        pool,
        quest,
        investor,
        questProbs,
        creationType
    ) {
        this.measure('citeRandomQuests')

        let filteredQuests = questConfig.citeRandomPreferOwn
            ? investor.questsCreated.map((qc) => {
                  return this._cachedQuests.get(qc)
              })
            : []

        if (filteredQuests.length < questProbs.citeOtherQuantity) {
            const randomFilteredQuests = this._cachedQuests
                .values()
                .filter(
                    (questIter) =>
                        questIter.name !== this.#DEFAULT_TOKEN &&
                        questIter.name !== quest.name &&
                        questIter.name !== questConfig.citeSingleName
                )

            const randomQuests = this.getRandomElements(
                randomFilteredQuests,
                questProbs.citeOtherQuantity - filteredQuests.length
            )

            if (randomQuests.length > 0) {
                filteredQuests = Array.prototype.concat(
                    filteredQuests,
                    randomQuests
                )
            }
        }

        this.citeQuests(
            day,
            investor,
            quest,
            pool,
            filteredQuests,
            questConfig.randomCitePerc,
            questConfig.citeRandomMultiplier,
            creationType
        )

        this.measure('citeRandomQuests', true)
    }

    citeRandomWithPriceHigher(conf, day, investor, quest, pool, creationType) {
        this.measure('citeRandomWithPriceHigher')

        const shouldCiteRandom = this.calcProb(conf.keepCitingProbability)

        if (!shouldCiteRandom) {
            this.measure('citeRandomWithPriceHigher', true)
            return
        }

        const priceMark = conf.keepCitingPriceHigherThan
        const potentialQuestPools = this._cachedPools.values().filter((cp) => {
            if (cp.isQuest() && cp.tokenRight !== quest.name) {
                const diff = priceDiff(cp.curPrice, pool.curPrice)

                if (diff > priceMark) {
                    return true
                }
            }
            return false
        })
        const potentialQuests = potentialQuestPools.map((pqp) =>
            this._cachedQuests.get(pqp.tokenRight)
        )
        const randomQuests = this.getRandomElements(potentialQuests, 1)

        if (!randomQuests.length) {
            this.measure('citeRandomWithPriceHigher', true)
            return
        }

        this.citeQuests(
            day,
            investor,
            quest,
            pool,
            randomQuests,
            conf.keepCitingSumPercentage,
            conf.keepCitingPosMultiplier,
            creationType
        )

        this.measure('citeRandomWithPriceHigher', true)
    }

    citeQuests(
        day,
        investor,
        citingQuest,
        citingPool,
        citedQuests,
        citingPercentage,
        citingPosMultiplier,
        creationType
    ) {
        this.measure('citeQuests')

        if (!citedQuests.length) {
            return
        }

        citedQuests.forEach((citedQuest) => {
            const citeOtherAmount = this.calculateCiteAmount(
                investor,
                citingQuest.name,
                citingPercentage,
                citedQuests.length
            )

            if (
                !citeOtherAmount ||
                typeof citeOtherAmount !== 'number' ||
                citeOtherAmount < 0
            ) {
                return
            }

            const citedPool = this._cachedPools.get(
                `${this.#DEFAULT_TOKEN}-${citedQuest.name}`
            )

            if (!citedPool || citedPool.name === citingPool.name) {
                return
            }

            let crossPool = this._cachedPools.get(
                `${citedQuest.name}-${citingQuest.name}`
            )

            if (!crossPool) {
                const startingPrice = citingPool.curPrice / citedPool.curPrice
                crossPool = investor.createPool(
                    citedQuest,
                    citingQuest,
                    startingPrice
                )

                this._dayData[day].actions.push({
                    pool: crossPool.name,
                    investorHash: investor.hash,
                    action: 'CREATED',
                    day
                })
                this._cachedPools.set(crossPool.name, crossPool)
            }

            const priceRange = investor.calculatePriceRange(
                crossPool,
                citedPool,
                citingPool,
                citingPosMultiplier
            )
            this._dayData[day].pools.push(crossPool)

            const citeAmount0 =
                crossPool.tokenLeft === citedQuest.name ? 0 : citeOtherAmount
            const citeAmount1 = citeAmount0 === 0 ? citeOtherAmount : 0

            const totalInOut = investor.citeQuest(
                crossPool,
                priceRange.min,
                priceRange.max,
                citeAmount0,
                citeAmount1,
                priceRange.native
            )

            if (!totalInOut) {
                console.warn('### ALERT: CITATION [' + day + ']###')
                console.warn(this._cachedPools)
                console.warn(`Failed to cite ${crossPool.name}`)
                console.warn(priceRange, citeAmount0, citeAmount1)
                console.warn(citingPool, citedPool)
                return
            }

            const orgQuest = this._cachedQuests.get(citingQuest.name)
            const ranQuest = this._cachedQuests.get(citedQuest.name)
            orgQuest.addPool(crossPool)
            ranQuest.addPool(crossPool)
            this._cachedQuests.set(orgQuest.name, orgQuest)
            this._cachedQuests.set(ranQuest.name, ranQuest)

            this._dayData[day].actions.push({
                pool: crossPool.name,
                price: crossPool.curPrice.toFixed(3),
                investorHash: investor.hash,
                action: 'CITED',
                totalAmountIn: citeOtherAmount.toFixed(3),
                day,
                opName:
                    Object.entries(priceRange)
                        .map((a) => `${a[0]}:${a[1]}`)
                        .join(', ') +
                    ' // ' +
                    totalInOut.join(',') +
                    ' // ' +
                    `Substract from ${citingQuest.name}, current balance: ${
                        investor.balances[citingQuest.name]
                    } cross pool: ${crossPool.name} ${crossPool.type}`
            })

            investor.addBalance(
                citingQuest.name,
                -totalInOut[0],
                'citing random quests'
            )

            const curTokenMissing = totalSingleMissingToken(
                citingQuest.name,
                this._cachedQuests.values(),
                this._cachedPools.values(),
                this._cachedInvestors.values()
            )

            // @TODO: check current leak against preserved leak data
            // @TODO: (curTokenMissing - prevTokensLeakData[citingQuest.name].total) > 0
            if (curTokenMissing > 0 && !isZero(curTokenMissing)) {
                console.warn('### ALERT: CITATION #2 RANDOM [' + day + ']###')
                console.warn(
                    `Despite all the correct actions, token ${citingQuest.name} went missing by ${curTokenMissing}`
                )
                console.warn(investor)
                console.warn(crossPool)
                console.warn(citingPool)
                console.warn(citedPool)

                investor.addBalance(
                    citingQuest.name,
                    curTokenMissing,
                    'Reimbursement for failed citation of a random quest'
                )

                // @TODO: breakpoint here and try trace citeRandomQuest
                // const totalInOut = investor.citeQuest(
                //     crossPool,
                //     priceRange.min,
                //     priceRange.max,
                //     citeAmount0,
                //     citeAmount1,
                //     priceRange.native
                // )
            }
            this._dayData[day]['pools'].push(crossPool)
        })

        this.measure('citeQuests', true)
    }

    simulateKeepCreatingQuest(day) {
        this.measure('simulateKeepCreatingQuest')

        const keepCreatingDays = Object.keys(this.keepCreatingInvs)
        keepCreatingDays.forEach((dayKey) => {
            if (day % dayKey === 0) {
                const investors = this.keepCreatingInvs[dayKey]
                investors.forEach((investorObj, idx) => {
                    const investor = investorObj.investor
                    const conf = investorObj.conf

                    if (
                        conf.keepCreatingQuests.length &&
                        conf.keepCreatingPeriodDays > 0
                    ) {
                        this.simulateQuestCreation(
                            investor,
                            day,
                            conf.keepCreatingQuests,
                            'keep-creating'
                        )
                    }
                })
            }
        })

        this.measure('simulateKeepCreatingQuest', true)
    }

    tradeSpecificQuest(conf, day, investor, router) {
        this.measure('tradeSpecificQuest')

        const spendAmount =
            (investor.balances[this.#DEFAULT_TOKEN] / 100) * conf.buySinglePerc

        let tradePool = this._cachedPools.get(
            `${this.#DEFAULT_TOKEN}-${conf.includeSingleName}`
        )

        if (conf.excludeSingleName === tradePool.tokenRight) {
            console.log(
                `Investing directly into ${conf.includeSingleName} quest with excluded set as ${conf.excludeSingleName}`
            )
            console.log(tradePool)
        }

        const [totalIn, totalOut] = router.smartSwap(
            this.#DEFAULT_TOKEN,
            tradePool.tokenRight,
            spendAmount,
            conf.smartRouteDepth
        )

        // collect pool price movements here and in other calls of router.smart Swap
        this.storeTradedPool(day, tradePool)

        // That would be an edge case, rare, but if happens, need to debug why
        if (
            isZero(totalIn) ||
            isZero(totalOut) ||
            isNaN(totalIn) ||
            isNaN(totalOut)
        ) {
            console.log(
                `[BUY SINGLE] Bad trade at: ${tradePool.name} ${totalIn} ${totalOut} ${spendAmount}`
            )
            return
        }
        this.processSwapData(
            investor,
            router.getSwaps(),
            day,
            `Invest directly in ${
                conf.includeSingleName
            } / total in ${totalIn.toFixed(3)}, total out ${totalOut.toFixed(
                3
            )}, initial amount in ${spendAmount}`
        )
        investor.addBalance(this.#DEFAULT_TOKEN, totalIn)
        investor.addBalance(tradePool.tokenRight, totalOut)

        this.measure('tradeSpecificQuest', true)
    }

    tradeTopGainers(conf, day, investor, router) {
        this.measure('tradeTopGainers')

        const spendAmount =
            (investor.balances[this.#DEFAULT_TOKEN] / 100) * conf.buySumPerc

        const tradePools = this.getTradePools(
            conf.buyQuestPerc,
            conf.buyGainerPerc,
            conf.excludeSingleName,
            conf.buyGainersFrequency
        )

        if (!tradePools.length) {
            return
        }

        const perPoolAmt = spendAmount / tradePools.length
        if (perPoolAmt <= 0 || isZero(perPoolAmt)) {
            return
        }

        tradePools.forEach((pool) => {
            if (conf.excludeSingleName === pool.tokenRight) {
                console.log(
                    `Trading ${pool.name} quest with excluded set as ${conf.excludeSingleName}`
                )
                console.log(pool)
            }

            const [totalIn, totalOut] = router.smartSwap(
                this.#DEFAULT_TOKEN,
                pool.tokenRight,
                perPoolAmt,
                conf.smartRouteDepth
            )

            //That would be an edge case, rare, but if happens, need to debug why
            if (
                isZero(totalIn) ||
                isZero(totalOut) ||
                isNaN(totalIn) ||
                isNaN(totalOut)
            ) {
                console.log(
                    `############################ [GAINERS] Bad trade at: ${pool.name} ${totalIn} ${totalOut} ${perPoolAmt}`
                )
                return
            }

            //collect pool price movements here and in other calls of router.smart Swap
            this.storeTradedPool(day, pool)

            // if (router.getSwaps()) {
            //     const usdcOut = router.getSwaps().reduce((acc, sw) => {
            //         if (sw.pool.indexOf('USDC') !== -1 && sw.op === 'BOUGHT') {
            //             return (acc += sw.in)
            //         }

            //         return (acc += 0)
            //     }, 0)
            //     console.log(`Total USDC consumed: ${usdcOut}`)
            //     console.log(router.getSwaps())
            // }
            this.processSwapData(
                investor,
                router.getSwaps(),
                day,
                `Buying top gainer ${
                    pool.tokenRight
                } / total in ${totalIn.toFixed(
                    3
                )}, total out ${totalOut.toFixed(
                    3
                )}, initial amount in ${perPoolAmt}`
            )
            investor.addBalance(
                this.#DEFAULT_TOKEN,
                totalIn,
                'buying top traders'
            )
            investor.addBalance(pool.tokenRight, totalOut, 'buying top traders')

            // Cite random quest by probabiliy
            const tradedQuest = this._cachedQuests.get(pool.tokenRight)
            this.citeRandomWithPriceHigher(
                conf,
                day,
                investor,
                tradedQuest,
                pool,
                'keep-citing'
            )
        })

        this.measure('tradeTopGainers', true)
    }

    tradeIncQuests(conf, day, investor, router) {
        this.measure('tradeIncQuests')

        const incPools = this.getChangedPriceQuests(
            investor.balances,
            conf.swapIncFrequency,
            conf.swapIncSumPerc,
            conf.swapIncByPerc,
            conf.swapIncDir
        )

        if (incPools.length) {
        }

        this.smartSwapPools(
            day,
            investor,
            router,
            incPools,
            conf.smartRouteDepth,
            conf.excludeSingleName,
            'inc'
        )

        this.measure('tradeIncQuests', true)
    }

    tradeDecQuests(conf, day, investor, router) {
        this.measure('tradeDecQuests')

        const decPools = this.getChangedPriceQuests(
            investor.balances,
            conf.swapDecFrequency,
            conf.swapDecSumPerc,
            conf.swapDecByPerc,
            conf.swapDecDir
        )

        if (decPools.length) {
        }

        this.smartSwapPools(
            day,
            investor,
            router,
            decPools,
            conf.smartRouteDepth,
            conf.excludeSingleName,
            'dec'
        )

        this.measure('tradeDecQuests', true)
    }

    simulateTrade(day, router) {
        this.measure('simulateTrade')

        const tradingDayKeys = Object.keys(this.tradingInvs)
        tradingDayKeys.forEach((dayKey) => {
            if (day % dayKey === 0) {
                const investors = this.tradingInvs[dayKey]
                investors.forEach((investorObj) => {
                    const investor = investorObj.investor
                    const conf = investorObj.conf

                    // Buy in specific quest
                    if (
                        conf.includeSingleName.length > 0 &&
                        conf.buySinglePerc > 0
                    ) {
                        // this.tradingHandlers.push(
                        //     new Promise((resolve) =>
                        //         resolve(
                        //             this.tradeSpecificQuest(
                        //                 conf,
                        //                 day,
                        //                 investor,
                        //                 router
                        //             )
                        //         )
                        //     )
                        // )
                        this.tradeSpecificQuest(conf, day, investor, router)
                    }

                    // Buy top gainers/random
                    if (
                        conf.buySumPerc &&
                        conf.buyGainerPerc &&
                        conf.buyQuestPerc
                    ) {
                        // this.tradingHandlers.push(
                        //     new Promise((resolve) =>
                        //         resolve(
                        //             this.tradeTopGainers(
                        //                 conf,
                        //                 day,
                        //                 investor,
                        //                 router
                        //             )
                        //         )
                        //     )
                        // )
                        this.tradeTopGainers(conf, day, investor, router)
                    }

                    // Swap owned:
                    // Tokens that increased in price
                    // this.tradingHandlers.push(
                    //     new Promise((resolve) =>
                    //         resolve(
                    //             this.tradeIncQuests(conf, day, investor, router)
                    //         )
                    //     )
                    // )
                    this.tradeIncQuests(conf, day, investor, router)

                    // Tokens that decreased in price
                    // this.tradingHandlers.push(
                    //     new Promise((resolve) =>
                    //         resolve(
                    //             this.tradeDecQuests(conf, day, investor, router)
                    //         )
                    //     )
                    // )
                    this.tradeDecQuests(conf, day, investor, router)
                })

                // Promise.all(this.tradingHandlers).catch((reason) => {
                //     console.log(`Could not finish all operations: ${reason}`)
                //     console.log(reason)
                // })
            }
        })

        this.measure('simulateTrade', true)
    }

    smartSwapPools(
        day,
        investor,
        router,
        selectedPools,
        smartRouteDepth,
        excludeSingleName,
        debugStr
    ) {
        this.measure('smartSwapPools')

        if (!selectedPools || !selectedPools.length) {
            return
        }

        selectedPools.forEach((poolData) => {
            const { pool, amount, swapDir } = poolData

            const [t0, t1] =
                swapDir === 'buy'
                    ? [pool.tokenLeft, pool.tokenRight]
                    : [pool.tokenRight, pool.tokenLeft]

            if (excludeSingleName === t0 || excludeSingleName === t1) {
                console.log(
                    `${swapDir} ${t0}/${t1} with excluded set as ${excludeSingleName}, direction ${debugStr}`
                )
                console.log(selectedPools.length)
            }

            const [totalIn, totalOut] = router.smartSwap(
                t0,
                t1,
                amount,
                smartRouteDepth
            )

            // collect pool price movements here and in other calls of router.smartSwap
            this.storeTradedPool(day, pool)

            if (
                isZero(totalIn) ||
                isZero(totalOut) ||
                isNaN(totalIn) ||
                isNaN(totalOut)
            ) {
                console.log(
                    `[selling/buying] Bad trade at: ${pool.name} ${totalIn} ${totalOut} ${amount}`
                )
                return
            }

            this.processSwapData(
                investor,
                router.getSwaps(),
                day,
                `${swapDir === 'buy' ? 'Buying' : 'Selling'} ${
                    debugStr === 'inc' ? 'increased' : 'decreased'
                } ${
                    swapDir === 'buy' ? pool.tokenLeft : pool.tokenRight
                } in price / total in ${totalIn.toFixed(
                    3
                )}, total out ${totalOut.toFixed(
                    3
                )}, initial amount in ${amount}`
            )
            investor.addBalance(t0, totalIn, 'selling gainers/losers')
            investor.addBalance(t1, totalOut, 'selling gainers/losers')
        })

        this.measure('smartSwapPools', true)
    }

    simulateWithdraw(day, router) {
        this.measure('simulateWithdraw')

        const valueSellingDayKeys = Object.keys(this.sellValueInvs)
        valueSellingDayKeys.forEach((dayKey) => {
            if (day % dayKey === 0) {
                const authors = this.sellValueInvs[dayKey]
                authors.forEach((authorObj) => {
                    const author = authorObj.investor
                    const conf = authorObj.conf

                    if (conf.valueSellAmount <= 0) {
                        return
                    }

                    // Sell own value here
                    const questArr = this.getRandomElements(
                        author.questsCreated,
                        1
                    )

                    if (!questArr[0]) {
                        return
                    }

                    const quest = questArr[0]

                    const questBalance =
                        author.balances[quest] && author.balances[quest] > 0
                            ? author.balances[quest]
                            : null

                    if (!questBalance) {
                        return
                    }

                    let alreadyWithdrawn = 0

                    while (
                        alreadyWithdrawn < conf.valueSellAmount &&
                        author.balances[quest] > 0
                    ) {
                        const sumIn =
                            author.balances[quest] >= 10
                                ? 10
                                : author.balances[quest]

                        if (conf.excludeSingleName) {
                            console.log(
                                `Withdrawing ${quest} quest with excluded set as ${conf.excludeSingleName}`
                            )
                        }

                        const [totalIn, totalOut] = router.smartSwap(
                            quest,
                            this.#DEFAULT_TOKEN,
                            sumIn,
                            conf.smartRouteDepth
                        )

                        if (
                            isNaN(totalIn) ||
                            isZero(totalIn) ||
                            isZero(totalOut)
                        ) {
                            const pool = this._cachedPools.get(
                                `${this.#DEFAULT_TOKEN}-${quest}`
                            )

                            console.log(
                                `Failed selling owned ${conf.valueSellAmount} ${quest}, expected token reserves are ${pool.volumeToken0}${pool.tokenLeft}`
                            )
                            break
                        }

                        this.processSwapData(
                            author,
                            router.getSwaps(),
                            day,
                            `Withdrawing ${
                                conf.valueSellAmount
                            } ${quest} / total in ${totalIn.toFixed(
                                3
                            )}, total out ${totalOut.toFixed(
                                3
                            )}, initial amount in ${sumIn}`
                        )

                        alreadyWithdrawn += totalOut
                        author.addBalance(
                            quest,
                            totalIn,
                            'withdrawing own USDC'
                        )
                        author.addBalance(
                            this.#DEFAULT_TOKEN,
                            totalOut,
                            'withdrawing own USDC'
                        )
                    }
                })
            }
        })

        this.measure('simulateWithdraw', true)
    }

    getChangedPriceQuests(
        invBalances,
        freq,
        sumOfOwnedTokens,
        percentageChange,
        swapDir
    ) {
        this.measure('getChangedPriceQuests')

        // Find investor's tokens by reading their balances
        const balancesLeftover = JSON.parse(JSON.stringify(invBalances))

        const invQuestPools = Object.keys(invBalances)
            .map((questName) =>
                this._cachedPools.get(`${this.#DEFAULT_TOKEN}-${questName}`)
            )
            .filter((x) => x)

        if (
            !invQuestPools ||
            !invQuestPools.length ||
            !this.#dailyTradedPools
        ) {
            return []
        }

        let selectedPools = []

        Object.entries(this.#dailyTradedPools)
            .filter((pd) => invQuestPools.find((ip) => ip.name === pd[0]))
            .forEach((poolData) => {
                const data = poolData[1].slice(-freq)

                const growthRate = data
                    .map((curr, id) => {
                        if (id === 0) return 0

                        const prevPoint = data[id - 1]
                        const rate = calcGrowthRate(curr.mcap, prevPoint.mcap)

                        return rate
                    })
                    .reduce((p, c) => p + c)

                if (
                    growthRate === 0 ||
                    (growthRate < 0 && growthRate >= percentageChange) ||
                    (growthRate > 0 && growthRate <= percentageChange)
                ) {
                    return []
                }

                const pool = invQuestPools.find(
                    (iqp) => iqp.name === poolData[0]
                )

                const tokenTrade =
                    swapDir === 'sell' ? pool.tokenRight : pool.tokenLeft
                const tokenBalance = invBalances[tokenTrade]
                const swapAmount = (tokenBalance / 100) * sumOfOwnedTokens

                balancesLeftover[tokenTrade] -= swapAmount

                if (
                    !swapAmount ||
                    swapAmount <= 0 ||
                    isNaN(swapAmount) ||
                    balancesLeftover[tokenTrade] < swapAmount ||
                    balancesLeftover[tokenTrade] === 0
                ) {
                    return []
                }

                selectedPools.push({
                    pool: invQuestPools.find((iqp) => iqp.name === poolData[0]),
                    amount: swapAmount,
                    swapDir
                })
            })

        this.measure('getChangedPriceQuests', true)

        return selectedPools
    }

    getTradePools(
        buyQuestPerc,
        buyGainerPerc,
        excludeSingleName,
        buyGainersFrequency
    ) {
        this.measure('getTradePools')

        const poolsAmount = Math.ceil(
            (this._cachedQuests.size / 100) * buyGainerPerc
        )

        const topGainers = this.getTopGainers(
            buyQuestPerc,
            poolsAmount,
            buyGainersFrequency
        )

        let randomGainers = []
        if (topGainers.length < poolsAmount) {
            const randomAmountToGet = poolsAmount - topGainers.length
            randomGainers = this.getRandomGainers(
                buyQuestPerc,
                randomAmountToGet
            )
        }

        let finalResult = Array.prototype.concat(topGainers, randomGainers)

        if (excludeSingleName) {
            finalResult = finalResult.filter(
                (pool) =>
                    pool.isQuest() && pool.tokenRight !== excludeSingleName
            )
        }

        this.measure('getTradePools', true)

        return finalResult
    }

    getTopGainers(buyQuestPerc, poolsAmount, buyGainersFrequency = 30) {
        this.measure('getTopGainers')

        // Collect top gainers of the last X days
        let gainers = []
        Object.entries(this.#dailyTradedPools).forEach((poolData) => {
            const data = poolData[1].slice(-buyGainersFrequency)

            const growthRate = data
                .map((curr, id) => {
                    if (id === 0) return 0

                    const prevPoint = data[id - 1]
                    const rate = calcGrowthRate(curr.mcap, prevPoint.mcap)

                    return rate
                })
                .reduce((p, c) => p + c)

            if (growthRate > 0) {
                gainers.push({
                    pool: poolData[0],
                    growth: growthRate
                })
            }
        })

        gainers.sort((a, b) => b.growth - a.growth)

        if (!poolsAmount) return []

        const topGainersSelected = this.getRandomElements(gainers, poolsAmount)

        if (!topGainersSelected.length) return []

        const investInAmount =
            Math.ceil(topGainersSelected.length / 100) * buyQuestPerc

        if (!investInAmount) return []

        const selectedGainers = this.getRandomElements(
            topGainersSelected,
            investInAmount
        )

        if (!selectedGainers.length) return []

        const selectedGainersReturn = selectedGainers
            .filter((x) => x)
            .map((pdata) => this._cachedPools.get(pdata.pool))

        this.measure('getTopGainers', true)

        return selectedGainersReturn
    }

    getRandomGainers(buyQuestPerc, questsAmount) {
        this.measure('getRandomGainers')

        const randomQuests = this.getRandomElements(
            this._cachedQuests.values(),
            questsAmount
        )

        if (!randomQuests.length) {
            return []
        }

        const toTradePools = randomQuests
            .map((quest) =>
                this._cachedPools.get(`${this.#DEFAULT_TOKEN}-${quest.name}`)
            )
            .filter((x) => x)

        const poolsAmount = Math.ceil(
            (toTradePools.length / 100) * buyQuestPerc
        )

        this.measure('getRandomGainers', true)

        return this.getRandomElements(toTradePools, poolsAmount)
    }

    calculateCiteAmount(investor, quest, percentage, quantity = 1) {
        this.measure('calculateCiteAmount')

        if (!investor || !investor.balances[quest]) {
            return null
        }

        const amount = (investor.balances[quest] / 100) * percentage

        if (amount < 2 || investor.balances[quest] < amount * quantity) {
            return null
        }

        this.measure('calculateCiteAmount', true)

        return amount
    }

    spawnInvestor(type, name, initialBalance) {
        this.measure('spawnInvestor')

        const investor = Investor.create(type, name, initialBalance)

        this._cachedInvestors.set(investor.hash, investor)

        this.measure('spawnInvestor', true)

        return investor
    }

    spawnQuest(investor, name) {
        this.measure('spawnQuest')

        const quest = investor.createQuest(name)
        const pool = quest.createPool()

        this._cachedQuests.set(quest.name, quest)
        let leftSideQuest = this._cachedQuests.get(`${this.#DEFAULT_TOKEN}`)

        if (leftSideQuest) {
            leftSideQuest.addPool(pool)
            this._cachedQuests.set(leftSideQuest.name, leftSideQuest)
        } else {
            leftSideQuest = new UsdcToken()
            leftSideQuest.addPool(pool)
            this._cachedQuests.set(leftSideQuest.name, leftSideQuest)
        }

        this._cachedPools.set(pool.name, pool)

        this.measure('spawnQuest', true)

        return { pool, quest }
    }

    calculateQuestProbabilities(questConfig) {
        this.measure('calculateQuestProbabilities')

        const chances = {
            citeSingle: false,
            citeOther: false,
            citeOtherQuantity: 0
        }

        chances.citeSingle = this.calcProb(questConfig.probCiteSingle)
        chances.citeOther = this.calcProb(questConfig.probRandomCite)

        chances.citeOtherQuantity =
            chances.citeOther && questConfig.probRandomCite > 100
                ? Math.floor(questConfig.probRandomCite / 100)
                : 1

        this.measure('calculateQuestProbabilities', true)

        return chances
    }

    calcProb(percentage) {
        this.measure('calcProb')

        const calcProb = this.#chance.bool({
            likelihood: percentage > 100 ? 100 : percentage
        })
        this.measure('calcProb', true)

        return calcProb
    }

    calculateInvProbabilities(inv) {
        this.measure('calculateInvProbabilities')

        const chances = {
            spawnInv: false,
            spawnInvQuantity: 0
        }

        chances.spawnInv = this.calcProb(inv.dailySpawnProbability)

        chances.spawnInvQuantity =
            chances.spawnInv && inv.dailySpawnProbability > 100
                ? Math.floor(inv.dailySpawnProbability / 100)
                : 1

        this.measure('calculateInvProbabilities', true)

        return chances
    }

    storeTradedPool(day, pool) {
        this.measure('storeTradedPool')

        if (!this.#dailyTradedPools[pool.name]) {
            this.#dailyTradedPools[pool.name] = []
        }

        // Removes previous trades of the day and keeps only the last one
        this.#dailyTradedPools[pool.name] = this.#dailyTradedPools[
            pool.name
        ].filter((trade) => trade.day !== day)

        this.#dailyTradedPools[pool.name].push({
            day,
            price: pool.curPrice,
            tvl: pool.getTVL(),
            mcap: pool.getMarketCap()
        })

        this.measure('storeTradedPool', true)
    }

    processSwapData(investor, swaps, day, opName = null) {
        this.measure('processSwapData')

        const combSwaps = getCombinedSwaps(swaps, this._cachedPools)
        Object.entries(combSwaps).forEach((ops) => {
            Object.entries(ops[1]).forEach((op) => {
                if (!this._dayData[day]) {
                    this._dayData[day] = { actions: [] }
                }

                const pool = this._cachedPools.get(ops[0])
                const swapData = formSwapData(
                    pool,
                    investor,
                    op[0],
                    op[1].totalAmountIn || null,
                    op[1].totalAmountOut || null,
                    op[1].path || null,
                    day,
                    opName
                )
                this._dayData[day].actions.push(swapData)
            })
        })

        this.measure('processSwapData', true)
    }

    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    getDayData(day) {
        return day ? this._dayData[day] : this._dayData
    }

    getRandomElements(arr, n) {
        this.measure('getRandomElements')

        let len = arr.length
        const result = new Array(n)
        const taken = new Array(len)

        if (len < 1) {
            return []
        }

        if (n > len) {
            n = len
        }

        while (n--) {
            const x = Math.floor(Math.random() * len)
            result[n] = arr[x in taken ? taken[x] : x]
            taken[x] = --len in taken ? taken[len] : len
        }

        this.measure('getRandomElements', true)

        return result.filter((x) => x)
    }

    getQuests() {
        return this._cachedQuests
            .values()
            .filter((q) => q.name !== this.#DEFAULT_TOKEN)
    }

    getInvestors() {
        return this._cachedInvestors.values()
    }

    getPools() {
        return this._cachedPools.values()
    }

    getDailyTradedPools() {
        return this.#dailyTradedPools
    }

    resetOpsTime() {
        this.#_OPS_TIME = _OPS_TIME_INITIAL
    }

    getOpsTime() {
        return this.#_OPS_TIME
    }
}

export default Generator
