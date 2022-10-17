import Chance from 'chance'
import HashMap from 'hashmap'

import Investor from '../Investor/Investor.class'
import UsdcToken from '../Quest/UsdcToken.class'
import Router from '../Router/Router.class'
import { formSwapData, getCombinedSwaps } from '../Utils/logicUtils'

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
        globalPools = [],
        globalQuests = [],
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
    }

    async step(day) {
        this.#dayData[day] = {
            investors: [],
            quests: [],
            pools: [],
            actions: []
        }
        const it0 = performance.now()
        this.#_OPS_TIME.invcreate.time = it0
        this.#invConfigs.forEach((conf) => {
            this.#_OPS_TIME.invcreate.ops++

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
        const it1 = performance.now()
        this.#_OPS_TIME.invcreate.time = it1 - this.#_OPS_TIME.invcreate.time

        // Every X days - keep creating quests
        // this.simulateKeepCreatingQuest(day)
        this.handlers.push(
            new Promise((resolve) => {
                resolve(this.simulateKeepCreatingQuest(day))
            })
        )

        // Every X days - buy/sell top gainers/increased or decreased in prices
        //this.simulateTrade(day, this.router)
        this.handlers.push(
            new Promise((resolve) => {
                resolve(this.simulateTrade(day, this.router))
            })
        )

        // Every X days - withdraw X in USDC value
        //this.simulateWithdraw(day, this.router)
        this.handlers.push(
            new Promise((resolve) => {
                resolve(this.simulateWithdraw(day, this.router))
            })
        )

        await Promise.allSettled(this.handlers)

        return this.#dayData[day]
    }

    simulateQuestCreation(investor, day, questType) {
        const questConfig = this.#questConfigs.find(
            (quest) => quest.questGenAlias === questType
        )

        // Do not create a new quest if not enough USDC for initial investment
        if (investor.balances.USDC < questConfig.initialAuthorInvest) {
            return
        }

        const questProbs = this.calculateQuestProbabilities(questConfig)

        const { pool, quest } = this.initializeQuest(questConfig, day, investor)
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
            // console.log(
            //     `${investor.name} Ran out of USDC, cannot invest and cite further`
            // )
            return
        }

        this.initialInvestment(
            questConfig.initialAuthorInvest,
            day,
            pool,
            quest,
            investor
        )

        // Static citation section (can be any selected quest, not just "Agora")
        if (questProbs.citeSingle && questConfig.citeSingleName) {
            this.citeSingleQuest(questConfig, day, pool, quest, investor)
        }

        if (questProbs.citeOther && questProbs.citeOtherQuantity > 0) {
            this.citeRandomQuests(
                questConfig,
                day,
                pool,
                quest,
                investor,
                questProbs
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

    initialInvestment(amountIn, day, pool, quest, investor) {
        const [totalIn, totalOut] = pool.buy(amountIn)
        this.#dayData[day].actions.push({
            pool: pool.name,
            price: pool.curPrice,
            investorHash: investor.hash,
            action: 'BOUGHT',
            totalAmountIn: totalIn.toFixed(3),
            totalAmountOut: totalOut.toFixed(3),
            day,
            mcap: pool.getMarketCap(),
            tvl: pool.getTVL(),
            paths: pool.name
        })
        this.storeTradedPool(day, pool)
        investor.addBalance(this.#DEFAULT_TOKEN, totalIn, 'initially investing')
        investor.addBalance(quest.name, totalOut, 'initially investing')
    }

    citeSingleQuest(questConfig, day, citingPool, citingQuest, investor) {
        const singleQuest = this.#cachedQuests.get(questConfig.citeSingleName)
        if (!singleQuest) {
            return
        }

        const citeSingleAmount = this.calculateCiteAmount(
            investor,
            citingQuest.name,
            questConfig.singleCitePerc
        )

        if (citeSingleAmount) {
            const pName = `${this.#DEFAULT_TOKEN}-${singleQuest.name}`
            if (!this.#cachedPools.has(pName)) {
                return
            }

            const singleUsdcPool = this.#cachedPools.get(pName)
            let crossPool

            if (
                !this.#cachedPools.has(
                    `${singleQuest.name}-${citingQuest.name}`
                )
            ) {
                const startingPrice =
                    citingPool.curPrice / singleUsdcPool.curPrice
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

            investor.addBalance(
                citingQuest.name,
                -totalIn,
                'citing single quest'
            )

            this.#cachedPools.set(crossPool.name, crossPool)
            this.#dayData[day]['pools'].push(crossPool)
        }
    }

    citeRandomQuests(questConfig, day, pool, quest, investor, questProbs) {
        const filteredQuests = this.#cachedQuests
            .values()
            .filter(
                (questIter) =>
                    questIter.name !== this.#DEFAULT_TOKEN &&
                    questIter.name !== quest.name
            )
        const randomQuests = this.getRandomElements(
            filteredQuests,
            questProbs.citeOtherQuantity
        )

        if (randomQuests.length) {
            randomQuests.forEach((randomQuest) => {
                const citeOtherAmount = this.calculateCiteAmount(
                    investor,
                    quest.name,
                    questConfig.randomCitePerc,
                    questProbs.citeOtherQuantity
                )

                const citedPool = this.#cachedPools.get(
                    `${this.#DEFAULT_TOKEN}-${randomQuest.name}`
                )

                if (!citedPool || citedPool.name === pool.name) {
                    console.log(
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

                const [totalIn, _] = investor.citeQuest(
                    crossPool,
                    priceRange.min,
                    priceRange.max,
                    citeAmount0,
                    citeAmount1,
                    priceRange.native
                )

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
        const kt0 = performance.now()
        this.#_OPS_TIME.keepcrt.time = kt0
        this.#_OPS_TIME.keepcrt.ops++
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
                            conf.keepCreatingQuests
                        )
                    }
                })
            }
        })
        const kt1 = performance.now()
        this.#_OPS_TIME.keepcrt.time = kt1 - this.#_OPS_TIME.keepcrt.time
    }

    tradeSpecificQuest(conf, day, investor, router) {
        const spendAmount =
            (investor.balances[this.#DEFAULT_TOKEN] / 100) * conf.buySinglePerc

        let tradePool = this.#cachedPools.get(
            `${this.#DEFAULT_TOKEN}-${conf.includeSingleName}`
        )

        let t0
        if (this.#_PERFORMANCE) {
            t0 = performance.now()
        }

        const [totalIn, totalOut] = router.smartSwap(
            this.#DEFAULT_TOKEN,
            tradePool.tokenRight,
            spendAmount,
            conf.smartRouteDepth
        )

        this.#_OPS++

        if (this.#_PERFORMANCE) {
            const t1 = performance.now()
            if (this.#_PERFORMANCE_OUTPUT)
                console.log(
                    `[${day}][${investor.name}] Invested directly in ${
                        conf.includeSingleName
                    } amount ${spendAmount} in ${t1 - t0}ms`
                )
            this.#_OPS_TIME.invest.ops++
            this.#_OPS_TIME.invest.time += t1 - t0
        }

        // collect pool price movements here and in other calls of router.smartSwap
        this.storeTradedPool(day, tradePool)

        // That would be an edge case, rare, but if happens, need to debug why
        if (
            router.isZero(totalIn) ||
            totalOut <= 0 ||
            router.isZero(totalOut) ||
            isNaN(totalIn) ||
            isNaN(totalOut)
        ) {
            console.log(
                `[BUY SINGLE] Bad trade at: ${tradePool.name} ${totalIn} ${totalOut} ${spendAmount}`
            )
            return
        }
        this.#processSwapData(investor, router.getSwaps(), day)
        investor.addBalance(tradePool.tokenLeft, totalIn)
        investor.addBalance(tradePool.tokenRight, totalOut)
    }

    tradeTopGainers(conf, day, investor, router) {
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
        if (perPoolAmt <= 0 || router.isZero(perPoolAmt)) {
            return
        }

        tradePools.forEach(async (pool) => {
            let t0
            if (this.#_PERFORMANCE) {
                t0 = performance.now()
            }

            const [totalIn, totalOut] = router.smartSwap(
                this.#DEFAULT_TOKEN,
                pool.tokenRight,
                perPoolAmt,
                conf.smartRouteDepth
            )

            this.#_OPS++
            if (this.#_PERFORMANCE) {
                const t1 = performance.now()
                if (this.#_PERFORMANCE_OUTPUT)
                    console.log(
                        `[${day}][${investor.name}] Traded top gainer in ${
                            pool.name
                        } amount ${perPoolAmt} in ${t1 - t0}ms`
                    )
                this.#_OPS_TIME.gainers.ops++
                this.#_OPS_TIME.gainers.time += t1 - t0
            }

            //collect pool price movements here and in other calls of router.smartSwap
            this.storeTradedPool(day, pool)

            //That would be an edge case, rare, but if happens, need to debug why
            if (
                router.isZero(totalIn) ||
                totalOut <= 0 ||
                router.isZero(totalOut) ||
                isNaN(totalIn) ||
                isNaN(totalOut)
            ) {
                console.log(
                    `[GAINERS] Bad trade at: ${pool.name} ${totalIn} ${totalOut} ${perPoolAmt}`
                )
                return
            }
            this.#processSwapData(investor, router.getSwaps(), day)
            investor.addBalance(pool.tokenLeft, totalIn, 'buying top traders')
            investor.addBalance(pool.tokenRight, totalOut, 'buying top traders')
        })
    }

    tradeIncQuests(conf, day, investor, router) {
        const incPools = this.getChangedPriceQuests(
            investor.balances,
            conf.swapIncFrequency,
            conf.swapIncSumPerc,
            conf.swapIncByPerc,
            conf.swapIncDir
        )

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
        const decPools = this.getChangedPriceQuests(
            investor.balances,
            conf.swapDecFrequency,
            conf.swapDecSumPerc,
            conf.swapDecByPerc,
            conf.swapDecDir
        )

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
                    // invBalances, freq, swapSum, swapPerc, swapDir
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

                await Promise.allSettled(this.tradingHandlers)
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
                sp0 = performance.now()
            }

            const [totalIn, totalOut] = router.smartSwap(
                t0,
                t1,
                amount,
                smartRouteDepth
            )

            this.#_OPS++

            if (this.#_PERFORMANCE) {
                const sp1 = performance.now()
                if (this.#_PERFORMANCE_OUTPUT)
                    console.log(
                        `[${day}][${
                            investor.name
                        }] Swapped inc/dec tokens on day ${day} into ${
                            pool.name
                        } amount ${amount} in ${sp1 - sp0}ms`
                    )
                this.#_OPS_TIME[debugStr].ops++
                this.#_OPS_TIME[debugStr].time += sp1 - sp0
            }

            // collect pool price movements here and in other calls of router.smartSwap
            this.storeTradedPool(day, pool)

            if (
                router.isZero(totalIn) ||
                totalOut <= 0 ||
                router.isZero(totalOut) ||
                isNaN(totalIn) ||
                isNaN(totalOut)
            ) {
                console.log(
                    `[selling] Bad trade at: ${pool.name} ${totalIn} ${totalOut} ${amount}`
                )
                selectedPools.forEach((tg) => {
                    console.table(tg)
                })
                return
            }

            this.#processSwapData(investor, router.getSwaps(), day)
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

                    let totalIn = 0
                    let totalOut = 0
                    while (
                        totalOut < conf.valueSellAmount &&
                        author.balances[quest] > 0
                    ) {
                        const sumIn =
                            author.balances[quest] >= 10
                                ? 10
                                : author.balances[quest]

                        let t0
                        if (this.#_PERFORMANCE) {
                            t0 = performance.now()
                        }

                        const [amtIn, amtOut] = router.smartSwap(
                            quest,
                            this.#DEFAULT_TOKEN,
                            sumIn,
                            conf.smartRouteDepth
                        )

                        this.#_OPS++

                        if (this.#_PERFORMANCE) {
                            const t1 = performance.now()
                            if (this.#_PERFORMANCE_OUTPUT)
                                console.log(
                                    `[${day}][${
                                        author.name
                                    }] Widthdrawn amount ${amtOut} for ${amtIn}${quest} in ${
                                        t1 - t0
                                    }ms`
                                )
                            this.#_OPS_TIME.withdraw.ops++
                            this.#_OPS_TIME.withdraw.time += t1 - t0
                        }

                        if (
                            isNaN(amtIn) ||
                            amtOut <= 0 ||
                            router.isZero(amtIn) ||
                            router.isZero(amtOut)
                        ) {
                            const pool = this.#cachedPools.get(
                                `${this.#DEFAULT_TOKEN}-${quest}`
                            )

                            console.log(
                                `Failed selling owned ${conf.valueSellAmount} ${quest}, expected token reserves are ${pool.volumeToken0}${pool.tokenLeft}`
                            )
                            break
                        }

                        this.#processSwapData(author, router.getSwaps(), day)

                        totalIn += amtIn
                        totalOut += amtOut
                        author.addBalance(quest, amtIn, 'withdrawing own USDC')
                        author.addBalance(
                            this.#DEFAULT_TOKEN,
                            amtOut,
                            'withdrawing own USDC'
                        )
                    }
                })
            }
        })
    }

    getChangedPriceQuests(invBalances, freq, swapSumPerc, swapPerc, swapDir) {
        // Find investor's tokens by reading their balances
        const balancesLeftover = JSON.parse(JSON.stringify(invBalances))

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
            return
        }

        let selectedPools = []

        Object.entries(this.#dailyTradedPools)
            .filter((pd) => invQuestPools.find((ip) => ip.name === pd[0]))
            .forEach((poolData) => {
                const data = poolData[1].slice(-freq)
                const growthRate =
                    ((data[data.length - 1].mcap - data[0].mcap) /
                        data[0].mcap) *
                    100

                if (
                    growthRate === 0 ||
                    (growthRate < 0 && growthRate >= swapPerc) ||
                    (growthRate > 0 && growthRate <= swapPerc)
                ) {
                    return
                }

                const pool = invQuestPools.find(
                    (iqp) => iqp.name === poolData[0]
                )

                const tokenTrade =
                    swapDir === 'sell' ? pool.tokenRight : pool.tokenLeft
                const tokenBalance = invBalances[tokenTrade]
                const swapAmount = (tokenBalance / 100) * swapSumPerc

                balancesLeftover[tokenTrade] -= swapAmount

                if (
                    !swapAmount ||
                    swapAmount <= 0 ||
                    isNaN(swapAmount) ||
                    balancesLeftover[tokenTrade] < swapAmount ||
                    balancesLeftover[tokenTrade] === 0
                ) {
                    return
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
            const growthRate =
                ((data[data.length - 1].mcap - data[0].mcap) / data[0].mcap) *
                100

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
            return null
        }

        const amount = (investor.balances[quest] / 100) * percentage

        if (amount < 2 || investor.balances[quest] < amount * quantity) {
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

        this.#dailyTradedPools[pool.name].push({
            day,
            price: pool.curPrice,
            tvl: pool.getTVL(),
            mcap: pool.getMarketCap()
        })
    }

    #processSwapData(investor, swaps, day) {
        const combSwaps = getCombinedSwaps(swaps, this.#cachedPools)
        Object.entries(combSwaps).forEach((ops) => {
            Object.entries(ops[1]).forEach((op) => {
                const pool = this.#cachedPools.get(ops[0])
                const swapData = formSwapData(
                    pool,
                    investor,
                    op[0],
                    op[1].totalAmountIn || null,
                    op[1].totalAmountOut || null,
                    op[1].path || null,
                    day
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

        if (len <= 1) {
            return []
        }

        if (n > len) {
            n = len - 1
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
