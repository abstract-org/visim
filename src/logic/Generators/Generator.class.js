import Chance from 'chance'
import HashMap from 'hashmap'

import Investor from '../Investor/Investor.class'
import UsdcToken from '../Quest/UsdcToken.class'
import Router from '../Router/Router.class'
import {
    calcGrowthRate,
    formSwapData,
    getCombinedSwaps,
    isZero
} from '../Utils/logicUtils'

const _OPS_TIME_INITIAL = {
    invcreate: { time: 0, ops: 0 },
    keepcrt: { time: 0, ops: 0 },
    withdraw: { time: 0, ops: 0 },
    invest: { time: 0, ops: 0 },
    gainers: { time: 0, ops: 0 },
    inc: { time: 0, ops: 0 },
    dec: { time: 0, ops: 0 }
}

class Generator {
    #invConfigs = []
    #questConfigs = []
    #chance = null
    #dayData = {}
    #cachedInvestors = []
    #cachedQuests = new HashMap()
    #cachedPools = new HashMap()
    #dailyTradedPools = []

    #WEB_DEBUG = false
    #DEFAULT_TOKEN = 'USDC'
    #PRICE_RANGE_MULTIPLIER = 2
    #_OPS = 0
    #_OPS_TIME = _OPS_TIME_INITIAL
    #_PERFORMANCE = false
    #_PERFORMANCE_OUTPUT = false

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
        swaps = [],
        performance,
        performanceOutput
    ) {
        this.#chance = Chance()

        this.#invConfigs = invConfigs
        this.#questConfigs = questConfigs
        this.#cachedQuests = globalQuests.clone()
        this.#cachedPools = globalPools.clone()

        this.router = new Router(this.#cachedQuests, this.#cachedPools)

        this.#_PERFORMANCE = performance
        this.#_PERFORMANCE_OUTPUT = performanceOutput

        if (swaps.length) {
            swaps.forEach((swap) =>
                this.storeTradedPool(swap.day, this.#cachedPools.get(swap.pool))
            )
        }

        const locSplit = document.location.href.split('?')
        if (locSplit && locSplit.length > 1 && locSplit[1] === 'debug') {
            this.#WEB_DEBUG = true
        }
    }

    webdbg(msg) {
        if (this.#WEB_DEBUG) {
            console.log(msg)
        }
    }

    async step(day) {
        this.#dayData[day] = {
            investors: [],
            quests: [],
            pools: [],
            actions: []
        }
        //const it0 =  = performance.now()
        //this.#_OPS_TIME.invcreate.time = it0
        this.#invConfigs.forEach((conf) => {
            //this.#_OPS_TIME.invcreate.ops++

            // Calculate probabilities
            const invProbs = this.calculateInvProbabilities(conf)
            this.webdbg('[GENERATOR] Calculated investor probabilities')
            this.webdbg(invProbs)

            // Generate investor with config by probability
            if (invProbs.spawnInv) {
                for (let i = 1; i <= invProbs.spawnInvQuantity; i++) {
                    const investor = this.initializeInvestor(conf, day)
                    this.webdbg(
                        `[GENERATOR] Initialized investor ${investor.name} on day ${day}`
                    )
                    this.webdbg(investor)

                    const questType = conf.createQuest

                    this.webdbg(
                        `Spawned investor ${investor.name} will ${
                            questType
                                ? 'create a quest'
                                : 'not create a quest, skipping'
                        }`
                    )

                    if (questType) {
                        this.simulateQuestCreation(
                            investor,
                            day,
                            conf.createQuest
                        )
                    }

                    this.#dayData[day]['investors'].push(investor)

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
        //const it1 =  = performance.now()
        //this.#_OPS_TIME.invcreate.time = it1 - this.#_OPS_TIME.invcreate.time

        // Every X days - keep creating quests
        this.handlers.push(
            new Promise((resolve) => {
                resolve(this.simulateKeepCreatingQuest(day))
            })
        )

        // Every X days - buy/sell top gainers/increased or decreased in prices
        this.handlers.push(
            new Promise((resolve) => {
                resolve(this.simulateTrade(day, this.router))
            })
        )

        // Every X days - withdraw X in USDC value
        this.handlers.push(
            new Promise((resolve) => {
                resolve(this.simulateWithdraw(day, this.router))
            })
        )

        await Promise.all(this.handlers)

        return this.#dayData[day]
    }

    simulateQuestCreation(
        investor,
        day,
        questType,
        creationType = 'regular-creation'
    ) {
        this.webdbg(
            `[GENERATOR] Simulating quest creation by ${investor.name} on day ${day}, type ${creationType}`
        )
        this.webdbg(questType)

        const questConfig = this.#questConfigs.find(
            (quest) => quest.questGenAlias === questType
        )

        // Do not create a new quest if not enough USDC for initial investment
        if (investor.balances.USDC < questConfig.initialAuthorInvest) {
            return
        }

        const questProbs = this.calculateQuestProbabilities(questConfig)
        this.webdbg(
            `[GENERATOR] Calculated quest probabilities (${creationType})`
        )
        this.webdbg(questProbs)
        this.webdbg(questConfig)

        const { pool, quest } = this.initializeQuest(questConfig, day, investor)
        this.webdbg(
            `[GENERATOR] Initialized quest and USDC pool (${creationType})`
        )
        this.webdbg(quest)
        this.webdbg(pool)

        this.#cachedQuests.set(quest.name, quest)
        this.#cachedPools.set(pool.name, pool)
        this.#dayData[day]['pools'].push(pool)
        this.#dayData[day]['quests'].push(quest)

        // Initial investment
        if (
            questConfig.initialAuthorInvest > 0 &&
            investor.balances[this.#DEFAULT_TOKEN] <
                questConfig.initialAuthorInvest
        ) {
            this.webdbg(
                `${investor.name} Ran out of USDC, cannot invest and cite further`
            )
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
    }

    addPeriodicInvestor(investor, conf, invType, periodInDays) {
        if (parseInt(conf[periodInDays]) > 0) {
            if (!this[invType][conf[periodInDays]]) {
                this[invType][conf[periodInDays]] = []
            }

            this[invType][conf[periodInDays]].push({
                investor,
                conf
            })
        }
    }

    initializeQuest(questConfig, day, investor) {
        // Generate quest by probability with config
        const questSum = this.#cachedQuests.size
        const { pool, quest } = this.spawnQuest(
            investor,
            `${questConfig.questGenName} (${questSum + 1})`
        )
        this.#dayData[day].actions.push({
            pool: pool.name,
            investorHash: investor.hash,
            action: 'CREATED',
            day
        })
        this.#dayData[day].quests.push(quest)
        this.#dayData[day].pools.push(pool)

        return { pool, quest }
    }

    initializeInvestor(invConfig, day) {
        const invSum = this.#cachedInvestors.length
        const investor = this.spawnInvestor(
            `${invConfig.invGenAlias}${invSum + 1}`,
            invConfig.invGenName,
            invConfig.initialBalance
        )
        this.#dayData[day].investors.push(investor)
        this.#dayData[day].actions.push({
            investorHash: investor.hash,
            action: 'SPAWNED',
            day
        })

        return investor
    }

    initialInvestment(amountIn, day, pool, quest, investor, creationType) {
        const [totalIn, totalOut] = pool.buy(amountIn)
        this.webdbg(
            `[GENERATOR] Made initial investment into pool ${pool.name}  (${creationType})`
        )
        this.webdbg(totalIn, totalOut)

        this.#dayData[day].actions.push({
            pool: pool.name,
            price: pool.curPrice,
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
    }

    citeSingleQuest(
        questConfig,
        day,
        citingPool,
        citingQuest,
        investor,
        creationType
    ) {
        this.webdbg(
            `[GENERATOR] Trying to cite specific ${citingQuest.name} quest`
        )

        const singleQuest = this.#cachedQuests.get(questConfig.citeSingleName)
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
        if (!this.#cachedPools.has(pName)) {
            return
        }

        const singleUsdcPool = this.#cachedPools.get(pName)
        let crossPool

        if (!this.#cachedPools.has(`${singleQuest.name}-${citingQuest.name}`)) {
            const startingPrice = citingPool.curPrice / singleUsdcPool.curPrice
            crossPool = investor.createPool(
                singleQuest,
                citingQuest,
                startingPrice
            )
            this.#dayData[day].actions.push({
                pool: crossPool.name,
                investorHash: investor.hash,
                action: 'CREATED',
                day
            })
        }

        const priceRange = investor.calculatePriceRange(
            crossPool,
            singleUsdcPool,
            citingPool,
            questConfig.citeSingleMultiplier
        )
        this.#dayData[day].pools.push(crossPool)

        const citeAmount0 =
            crossPool.tokenLeft === singleQuest.name ? 0 : citeSingleAmount
        const citeAmount1 = citeAmount0 === 0 ? citeSingleAmount : 0

        const [totalIn, totalOut] = investor.citeQuest(
            crossPool,
            priceRange.min,
            priceRange.max,
            citeAmount0,
            citeAmount1,
            priceRange.native
        )

        this.webdbg(
            `[GENERATOR] ${investor.name} cited ${singleQuest.name} on day ${day} by depositing ${citeSingleAmount} of ${citingQuest.name}  (${creationType})`
        )
        this.webdbg(priceRange)
        this.webdbg([totalIn, totalOut])

        const orgQuest = this.#cachedQuests.get(citingQuest.name)
        const sinQuest = this.#cachedQuests.get(singleQuest.name)
        orgQuest.addPool(crossPool)
        sinQuest.addPool(crossPool)
        this.#cachedQuests.set(orgQuest.name, orgQuest)
        this.#cachedQuests.set(sinQuest.name, sinQuest)

        this.#dayData[day].actions.push({
            pool: crossPool.name,
            price: citingPool.curPrice,
            investorHash: investor.hash,
            action: 'CITED',
            totalAmountIn: citeSingleAmount.toFixed(3),
            day
        })

        investor.addBalance(citingQuest.name, -totalIn, 'citing single quest')

        this.#cachedPools.set(crossPool.name, crossPool)
        this.#dayData[day]['pools'].push(crossPool)
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
        this.webdbg(`[GENERATOR] Trying to cite random quests`)
        const filteredQuests = this.#cachedQuests
            .values()
            .filter(
                (questIter) =>
                    questIter.name !== this.#DEFAULT_TOKEN &&
                    questIter.name !== quest.name
            )
        this.webdbg(`Got ${filteredQuests.length} filtered quests`)
        this.webdbg(filteredQuests)

        const randomQuests = this.getRandomElements(
            filteredQuests,
            questProbs.citeOtherQuantity
        )
        this.webdbg(`Got ${randomQuests.length} randomized quests`)
        this.webdbg(randomQuests)

        if (randomQuests.length) {
            randomQuests.forEach((randomQuest) => {
                const citeOtherAmount = this.calculateCiteAmount(
                    investor,
                    quest.name,
                    questConfig.randomCitePerc,
                    questProbs.citeOtherQuantity
                )

                if (
                    !citeOtherAmount ||
                    typeof citeOtherAmount !== 'number' ||
                    citeOtherAmount < 0
                ) {
                    return
                }

                const citedPool = this.#cachedPools.get(
                    `${this.#DEFAULT_TOKEN}-${randomQuest.name}`
                )

                if (!citedPool || citedPool.name === pool.name) {
                    this.webdbg(
                        `Could not find pool for citing, wanted ${randomQuest.name} got`,
                        citedPool
                    )
                    return
                }

                let crossPool = this.#cachedPools.get(
                    `${randomQuest.tokenLeft}-${quest.name}`
                )

                if (!crossPool) {
                    const startingPrice = pool.curPrice / citedPool.curPrice
                    crossPool = investor.createPool(
                        randomQuest,
                        quest,
                        startingPrice
                    )

                    this.webdbg(
                        `Created cross-pool ${crossPool.name}, starting price ${startingPrice}`
                    )

                    this.#dayData[day].actions.push({
                        pool: crossPool.name,
                        investorHash: investor.hash,
                        action: 'CREATED',
                        day
                    })
                }

                const priceRange = investor.calculatePriceRange(
                    crossPool,
                    citedPool,
                    pool,
                    questConfig.citeRandomMultiplier
                )
                this.#dayData[day].pools.push(crossPool)

                const citeAmount0 =
                    crossPool.tokenLeft === randomQuest.name
                        ? 0
                        : citeOtherAmount
                const citeAmount1 = citeAmount0 === 0 ? citeOtherAmount : 0

                const [totalIn, totalOut] = investor.citeQuest(
                    crossPool,
                    priceRange.min,
                    priceRange.max,
                    citeAmount0,
                    citeAmount1,
                    priceRange.native
                )

                this.webdbg(
                    `[GENERATOR] ${investor.name} cited random ${randomQuest.name} by depositing ${citeOtherAmount} of ${quest.name}  (${creationType})`
                )
                this.webdbg(priceRange)
                this.webdbg([totalIn, totalOut])

                const orgQuest = this.#cachedQuests.get(quest.name)
                const ranQuest = this.#cachedQuests.get(randomQuest.name)
                orgQuest.addPool(crossPool)
                ranQuest.addPool(crossPool)
                this.#cachedQuests.set(orgQuest.name, orgQuest)
                this.#cachedQuests.set(ranQuest.name, ranQuest)

                this.#dayData[day].actions.push({
                    pool: crossPool.name,
                    price: crossPool.curPrice,
                    investorHash: investor.hash,
                    action: 'CITED',
                    totalAmountIn: citeOtherAmount.toFixed(3),
                    day
                })
                investor.addBalance(
                    quest.name,
                    -totalIn,
                    'citing random quests'
                )

                this.#cachedPools.set(crossPool.name, crossPool)
                this.#dayData[day]['pools'].push(crossPool)
            })
        }
    }

    simulateKeepCreatingQuest(day) {
        //const kt0 =  = performance.now()
        //this.#_OPS_TIME.keepcrt.time = kt0
        //this.#_OPS_TIME.keepcrt.ops++
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
        //const kt1 =  = performance.now()
        //this.#_OPS_TIME.keepcrt.time = kt1 - this.#_OPS_TIME.keepcrt.time
    }

    tradeSpecificQuest(conf, day, investor, router) {
        const spendAmount =
            (investor.balances[this.#DEFAULT_TOKEN] / 100) * conf.buySinglePerc

        let tradePool = this.#cachedPools.get(
            `${this.#DEFAULT_TOKEN}-${conf.includeSingleName}`
        )

        let t0
        if (this.#_PERFORMANCE) {
            //t0 =  = performance.now()
        }

        const [totalIn, totalOut] = router.smartSwap(
            this.#DEFAULT_TOKEN,
            tradePool.tokenRight,
            spendAmount,
            conf.smartRouteDepth
        )

        this.webdbg(
            `[GENERATOR] Invested directly in ${tradePool.tokenRight} sum ${spendAmount} got in/out: ${totalIn}/${totalOut}`
        )

        //this.#_OPS++

        if (this.#_PERFORMANCE) {
            //const t1 =  = performance.now()
            //if (this.#_PERFORMANCE_OUTPUT)
            // console.log(
            //     `[${day}][${investor.name}] Invested directly in ${
            //         conf.includeSingleName
            //     } amount ${spendAmount} in ${t1 - t0}ms`
            // )
            //this.#_OPS_TIME.invest.ops++
            //this.#_OPS_TIME.invest.time += t1 - t0
        }

        // collect pool price movements here and in other calls of router.smartSwap
        this.storeTradedPool(day, tradePool)

        // That would be an edge case, rare, but if happens, need to debug why
        if (
            isZero(totalIn) ||
            totalOut <= 0 ||
            isZero(totalOut) ||
            isNaN(totalIn) ||
            isNaN(totalOut)
        ) {
            console.log(
                `[BUY SINGLE] Bad trade at: ${tradePool.name} ${totalIn} ${totalOut} ${spendAmount}`
            )
            return
        }
        this.#processSwapData(
            investor,
            router.getSwaps(),
            day,
            `Invest directly in ${conf.includeSingleName}, smart routed ${
                router.getPaths().length
            } times / total in ${totalIn}, total out ${totalOut}`
        )
        investor.addBalance(tradePool.tokenLeft, totalIn)
        investor.addBalance(tradePool.tokenRight, totalOut)
    }

    tradeTopGainers(conf, day, investor, router) {
        this.webdbg(`[GENERATOR] Buying top gainers on day ${day}`)
        const spendAmount =
            (investor.balances[this.#DEFAULT_TOKEN] / 100) * conf.buySumPerc

        const tradePools = this.getTradePools(
            conf.buyQuestPerc,
            conf.buyGainerPerc,
            conf.excludeSingleName,
            conf.buyGainersFrequency
        )

        if (!tradePools.length) {
            this.webdbg(`Could not find top gainer pools on day ${day}`)
            return
        }

        const perPoolAmt = spendAmount / tradePools.length
        if (perPoolAmt <= 0 || isZero(perPoolAmt)) {
            return
        }

        this.webdbg(`[GENERATOR] Found ${tradePools.length} top gainers`)
        this.webdbg(tradePools)

        tradePools.forEach(async (pool) => {
            let t0
            if (this.#_PERFORMANCE) {
                //t0 =  = performance.now()
            }

            const [totalIn, totalOut] = router.smartSwap(
                this.#DEFAULT_TOKEN,
                pool.tokenRight,
                perPoolAmt,
                conf.smartRouteDepth
            )

            this.webdbg(
                `Top gainer traded ${investor.name} buying ${pool.tokenRight}, put in ${totalIn} got out ${totalOut}`
            )

            //this.#_OPS++
            if (this.#_PERFORMANCE) {
                //const t1 =  = performance.now()
                // if (this.#_PERFORMANCE_OUTPUT)
                //     console.log(
                //         `[${day}][${investor.name}] Traded top gainer in ${
                //             pool.name
                //         } amount ${perPoolAmt} in ${t1 - t0}ms`
                //     )
                // this.#_OPS_TIME.gainers.ops++
                // this.#_OPS_TIME.gainers.time += t1 - t0
            }

            //collect pool price movements here and in other calls of router.smartSwap
            this.storeTradedPool(day, pool)
            //That would be an edge case, rare, but if happens, need to debug why
            if (
                isZero(totalIn) ||
                totalOut <= 0 ||
                isZero(totalOut) ||
                isNaN(totalIn) ||
                isNaN(totalOut)
            ) {
                console.log(
                    `[GAINERS] Bad trade at: ${pool.name} ${totalIn} ${totalOut} ${perPoolAmt}`
                )
                return
            }
            this.#processSwapData(
                investor,
                router.getSwaps(),
                day,
                `Buying top gainer ${pool.tokenRight}, smart routed ${
                    router.getPaths().length
                } times / total in ${totalIn}, total out ${totalOut}`
            )
            investor.addBalance(pool.tokenLeft, totalIn, 'buying top traders')
            investor.addBalance(pool.tokenRight, totalOut, 'buying top traders')
        })
    }

    tradeIncQuests(conf, day, investor, router) {
        this.webdbg(
            `[GENERATOR] Selecting pools that increased in price for ${investor.name} on day ${day}`
        )
        const incPools = this.getChangedPriceQuests(
            investor.balances,
            conf.swapIncFrequency,
            conf.swapIncSumPerc,
            conf.swapIncByPerc,
            conf.swapIncDir
        )

        if (incPools.length) {
            this.webdbg(
                `[GENERATOR] Selected ${incPools.length} pools that increased in price over the last ${conf.swapIncFrequency}, will ${conf.swapIncDir}`
            )
            this.webdbg(incPools)
        }

        this.smartSwapPools(
            day,
            investor,
            router,
            incPools,
            conf.smartRouteDepth,
            'inc'
        )
    }

    tradeDecQuests(conf, day, investor, router) {
        this.webdbg(
            `[GENERATOR] Selecting pools that decreased in price for ${investor.name} on day ${day}`
        )
        const decPools = this.getChangedPriceQuests(
            investor.balances,
            conf.swapDecFrequency,
            conf.swapDecSumPerc,
            conf.swapDecByPerc,
            conf.swapDecDir
        )

        if (decPools.length) {
            this.webdbg(
                `[GENERATOR] Selected ${decPools.length} pools that decreased in price over the last ${conf.swapDecFrequency}, will ${conf.swapDecDir}`
            )
            this.webdbg(decPools)
        }

        this.smartSwapPools(
            day,
            investor,
            router,
            decPools,
            conf.smartRouteDepth,
            'dec'
        )
    }

    simulateTrade(day, router) {
        const tradingDayKeys = Object.keys(this.tradingInvs)
        tradingDayKeys.forEach(async (dayKey) => {
            this.webdbg(
                `[GENERATOR] Simulating trade day ${day}, trading day current ${dayKey}`
            )
            if (day % dayKey === 0) {
                const investors = this.tradingInvs[dayKey]
                investors.forEach((investorObj) => {
                    const investor = investorObj.investor
                    const conf = investorObj.conf

                    // Buy in specific quest
                    if (conf.includeSingleName.length && conf.buySinglePerc) {
                        this.tradingHandlers.push(
                            new Promise((resolve) =>
                                resolve(
                                    this.tradeSpecificQuest(
                                        conf,
                                        day,
                                        investor,
                                        router
                                    )
                                )
                            )
                        )
                    }

                    // Buy top gainers/random
                    if (
                        conf.buySumPerc &&
                        conf.buyGainerPerc &&
                        conf.buyQuestPerc
                    ) {
                        this.tradingHandlers.push(
                            new Promise((resolve) =>
                                resolve(
                                    this.tradeTopGainers(
                                        conf,
                                        day,
                                        investor,
                                        router
                                    )
                                )
                            )
                        )
                    }

                    // Swap owned:
                    // Tokens that increased in price
                    this.tradingHandlers.push(
                        new Promise((resolve) =>
                            resolve(
                                this.tradeIncQuests(conf, day, investor, router)
                            )
                        )
                    )

                    // Tokens that decreased in price
                    this.tradingHandlers.push(
                        new Promise((resolve) =>
                            resolve(
                                this.tradeDecQuests(conf, day, investor, router)
                            )
                        )
                    )
                })

                await Promise.all(this.tradingHandlers)
            }
        })
    }

    smartSwapPools(
        day,
        investor,
        router,
        selectedPools,
        smartRouteDepth,
        debugStr
    ) {
        if (!selectedPools || !selectedPools.length) {
            this.webdbg(`No pools passed for inc/dec swap`)
            return
        }

        selectedPools.forEach((poolData) => {
            const { pool, amount, swapDir } = poolData

            const [t0, t1] =
                swapDir === 'buy'
                    ? [pool.tokenLeft, pool.tokenRight]
                    : [pool.tokenRight, pool.tokenLeft]

            let sp0
            if (this.#_PERFORMANCE) {
                //sp0 =  = performance.now()
            }

            this.webdbg(
                `Will swap(${swapDir}) ${t0} for ${t1} with ${amount}, involved pool ${pool.name}`
            )
            this.webdbg(pool)

            const [totalIn, totalOut] = router.smartSwap(
                t0,
                t1,
                amount,
                smartRouteDepth
            )

            this.webdbg(
                `[GENERATOR] Traded pool ${pool.name} that ${debugStr} in price, action ${swapDir}, amount ${amount}, token0 ${t0} for token1 ${t1}`
            )
            this.webdbg([totalIn, totalOut])

            //this.#_OPS++

            if (this.#_PERFORMANCE) {
                //const sp1 =  = performance.now()
                // if (this.#_PERFORMANCE_OUTPUT)
                //     console.log(
                //         `[${day}][${
                //             investor.name
                //         }] Swapped inc/dec tokens on day ${day} into ${
                //             pool.name
                //         } amount ${amount} in ${sp1 - sp0}ms`
                //     )
                // this.#_OPS_TIME[debugStr].ops++
                // this.#_OPS_TIME[debugStr].time += sp1 - sp0
            }

            // collect pool price movements here and in other calls of router.smartSwap
            this.storeTradedPool(day, pool)

            if (
                isZero(totalIn) ||
                totalOut <= 0 ||
                isZero(totalOut) ||
                isNaN(totalIn) ||
                isNaN(totalOut)
            ) {
                console.log(
                    `[selling/buying] Bad trade at: ${pool.name} ${totalIn} ${totalOut} ${amount}`
                )
                return
            }

            this.webdbg(
                `[GENERATOR] Storing logs of increased/decreased token trade`
            )

            this.#processSwapData(
                investor,
                router.getSwaps(),
                day,
                `${swapDir === 'buy' ? 'Buying' : 'Selling'} ${
                    debugStr === 'inc' ? 'increased' : 'decreased'
                } ${
                    swapDir === 'buy' ? pool.tokenLeft : pool.tokenRight
                } in price, smart routed ${
                    router.getPaths().length
                } times / total in ${totalIn}, total out ${totalOut}`
            )
            investor.addBalance(t0, totalIn, 'selling gainers/losers')
            investor.addBalance(t1, totalOut, 'selling gainers/losers')
        })
    }

    simulateWithdraw(day, router) {
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

                        let t0
                        if (this.#_PERFORMANCE) {
                            //t0 =  = performance.now()
                        }

                        const [totalIn, totalOut] = router.smartSwap(
                            quest,
                            this.#DEFAULT_TOKEN,
                            sumIn,
                            conf.smartRouteDepth
                        )

                        //this.#_OPS++

                        if (this.#_PERFORMANCE) {
                            //const t1 =  = performance.now()
                            // if (this.#_PERFORMANCE_OUTPUT)
                            //     console.log(
                            //         `[${day}][${
                            //             author.name
                            //         }] Widthdrawn amount ${amtOut} for ${amtIn}${quest} in ${
                            //             t1 - t0
                            //         }ms`
                            //     )
                            // this.#_OPS_TIME.withdraw.ops++
                            // this.#_OPS_TIME.withdraw.time += t1 - t0
                        }

                        if (
                            isNaN(totalIn) ||
                            totalOut <= 0 ||
                            isZero(totalIn) ||
                            isZero(totalOut)
                        ) {
                            const pool = this.#cachedPools.get(
                                `${this.#DEFAULT_TOKEN}-${quest}`
                            )

                            console.log(
                                `Failed selling owned ${conf.valueSellAmount} ${quest}, expected token reserves are ${pool.volumeToken0}${pool.tokenLeft}`
                            )
                            break
                        }

                        this.#processSwapData(
                            author,
                            router.getSwaps(),
                            day,
                            `Withdrawing ${
                                conf.valueSellAmount
                            } ${quest}, smart routed ${
                                router.getPaths().length
                            } times / total in ${totalIn}, total out ${totalOut}`
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
    }

    getChangedPriceQuests(
        invBalances,
        freq,
        sumOfOwnedTokens,
        percentageChange,
        swapDir
    ) {
        // Find investor's tokens by reading their balances
        const balancesLeftover = JSON.parse(JSON.stringify(invBalances))

        this.webdbg(balancesLeftover)

        const invQuestPools = Object.keys(invBalances)
            .map((questName) =>
                this.#cachedPools.get(`${this.#DEFAULT_TOKEN}-${questName}`)
            )
            .filter((x) => x)

        if (
            !invQuestPools ||
            !invQuestPools.length ||
            !this.#dailyTradedPools
        ) {
            this.webdbg(
                `Investor has no qualifying quest balances to ${swapDir}`
            )
            return []
        }

        this.webdbg(`Found potential ${invQuestPools.length} quests`)

        let selectedPools = []

        Object.entries(this.#dailyTradedPools)
            .filter((pd) => invQuestPools.find((ip) => ip.name === pd[0]))
            .forEach((poolData) => {
                const data = poolData[1].slice(-freq)
                this.webdbg(
                    `[GENERATOR] Calculating growth rate for ${poolData[0]} during ${swapDir} of inc/dec`
                )
                this.webdbg(data)
                const growthRate = data
                    .map((curr, id) => {
                        if (id === 0) return 0

                        const prevPoint = data[id - 1]
                        const rate = calcGrowthRate(curr.mcap, prevPoint.mcap)

                        return rate
                    })
                    .reduce((p, c) => p + c)

                this.webdbg(
                    `Pool ${poolData[0]} has a growth rate of ${growthRate}`
                )

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

                this.webdbg(
                    `Want to ${swapDir} ${tokenTrade} - amount ${swapAmount}`
                )

                if (
                    !swapAmount ||
                    swapAmount <= 0 ||
                    isNaN(swapAmount) ||
                    balancesLeftover[tokenTrade] < swapAmount ||
                    balancesLeftover[tokenTrade] === 0
                ) {
                    this.webdbg(
                        `Not enough balance to trade ${swapAmount} ${tokenTrade}`
                    )
                    return []
                }

                selectedPools.push({
                    pool: invQuestPools.find((iqp) => iqp.name === poolData[0]),
                    amount: swapAmount,
                    swapDir
                })
            })
        return selectedPools
    }

    getTradePools(
        buyQuestPerc,
        buyGainerPerc,
        excludeSingleName,
        buyGainersFrequency
    ) {
        const poolsAmount = Math.ceil(
            (this.#cachedQuests.size / 100) * buyGainerPerc
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
            finalResult.filter(
                (pool) =>
                    pool.isQuest() && pool.tokenRight !== excludeSingleName
            )
        }

        return finalResult
    }

    getTopGainers(buyQuestPerc, poolsAmount, buyGainersFrequency = 30) {
        // Collect top gainers of the last X days
        let gainers = []
        Object.entries(this.#dailyTradedPools).forEach((poolData) => {
            const data = poolData[1].slice(-buyGainersFrequency)
            this.webdbg(
                `[GENERATOR] Calculating growth rate for ${poolData[0]} during finding top gainers`
            )
            const growthRate = data
                .map((curr, id) => {
                    if (id === 0) return 0

                    const prevPoint = data[id - 1]
                    const rate = calcGrowthRate(curr.mcap, prevPoint.mcap)

                    return rate
                })
                .reduce((p, c) => p + c)

            this.webdbg(
                `Pool ${poolData[0]} has a growth rate of ${growthRate}`
            )

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

        return selectedGainers
            .filter((x) => x)
            .map((pdata) => this.#cachedPools.get(pdata.pool))
    }

    getRandomGainers(buyQuestPerc, questsAmount) {
        const randomQuests = this.getRandomElements(
            this.#cachedQuests.values(),
            questsAmount
        )

        if (!randomQuests.length) {
            return []
        }

        const toTradePools = randomQuests
            .map((quest) =>
                this.#cachedPools.get(`${this.#DEFAULT_TOKEN}-${quest.name}`)
            )
            .filter((x) => x)

        const poolsAmount = Math.ceil(
            (toTradePools.length / 100) * buyQuestPerc
        )

        return this.getRandomElements(toTradePools, poolsAmount)
    }

    calculateCiteAmount(investor, quest, percentage, quantity = 1) {
        if (!investor || !investor.balances[quest]) {
            this.webdbg(
                `Could not calculate cite amount due to invalid investor or no balance exists for quest ${quest}`
            )
            return null
        }

        const amount = (investor.balances[quest] / 100) * percentage

        if (amount < 2 || investor.balances[quest] < amount * quantity) {
            this.webdbg(
                `Could not get cite amount for quest ${quest} as not enough balance`
            )
            return null
        }

        return amount
    }

    spawnInvestor(type, name, initialBalance) {
        const id = this.#cachedInvestors.length + 1
        const investor = Investor.create(
            type,
            `${name} (${id})`,
            initialBalance
        )

        this.#cachedInvestors.push(investor)

        return investor
    }

    spawnQuest(investor, name) {
        const quest = investor.createQuest(name)
        const pool = quest.createPool()

        this.#cachedQuests.set(quest.name, quest)
        let leftSideQuest = this.#cachedQuests.get(`${this.#DEFAULT_TOKEN}`)

        if (leftSideQuest) {
            leftSideQuest.addPool(pool)
            this.#cachedQuests.set(leftSideQuest.name, leftSideQuest)
        } else {
            leftSideQuest = new UsdcToken()
            leftSideQuest.addPool(pool)
            this.#cachedQuests.set(leftSideQuest.name, leftSideQuest)
        }

        this.#cachedPools.set(pool.name, pool)

        return { pool, quest }
    }

    calculateQuestProbabilities(questConfig) {
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

        return chances
    }

    calcProb(percentage) {
        return this.#chance.bool({
            likelihood: percentage > 100 ? 100 : percentage
        })
    }

    calculateInvProbabilities(inv) {
        const chances = {
            spawnInv: false,
            spawnInvQuantity: 0
        }

        chances.spawnInv = this.calcProb(inv.dailySpawnProbability)
        this.webdbg(
            `Calculating investor spawn probably with a daily chance of ${inv.dailySpawnProbability}`
        )

        chances.spawnInvQuantity =
            chances.spawnInv && inv.dailySpawnProbability > 100
                ? Math.floor(inv.dailySpawnProbability / 100)
                : 1

        return chances
    }

    storeTradedPool(day, pool) {
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
    }

    #processSwapData(investor, swaps, day, opName = null) {
        const combSwaps = getCombinedSwaps(swaps, this.#cachedPools)
        Object.entries(combSwaps).forEach((ops) => {
            Object.entries(ops[1]).forEach((op) => {
                if (!this.#dayData[day]) {
                    this.#dayData[day] = { actions: [] }
                }

                const pool = this.#cachedPools.get(ops[0])
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
                this.#dayData[day].actions.push(swapData)
            })
        })
    }

    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    getDayData(day) {
        return day ? this.#dayData[day] : this.#dayData
    }

    getRandomElements(arr, n) {
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

        return result.filter((x) => x)
    }

    getQuests() {
        return this.#cachedQuests
            .values()
            .filter((q) => q.name !== this.#DEFAULT_TOKEN)
    }

    getInvestors() {
        return this.#cachedInvestors
    }

    getPools() {
        return this.#cachedPools.values()
    }

    getDailyTradedPools() {
        return this.#dailyTradedPools
    }

    getOps() {
        return this.#_OPS
    }

    resetOpsTime() {
        this.#_OPS_TIME = _OPS_TIME_INITIAL
    }

    getOpsTime() {
        return this.#_OPS_TIME
    }
}

export default Generator
