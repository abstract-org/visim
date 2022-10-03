import { faker } from '@faker-js/faker'
import Chance from 'chance'

import Investor from '../Investor/Investor.class'
import Router from '../Router/Router.class'
import { formSwapData, getCombinedSwaps } from '../Utils/logicUtils'

class Generator {
    #invConfigs = []
    #questConfigs = []
    #chance = null
    #dayData = {}
    #DEFAULT_TOKEN = 'USDC'
    #PRICE_RANGE_MULTIPLIER = 2

    #cachedInvestors = []
    #cachedQuests = []
    #cachedPools = []
    #dailyTradedPools = []

    keepCreatingInvs = {}
    tradingInvs = {}
    sellValueInvs = {}

    constructor(invConfigs, questConfigs, globalPools = [], globalQuests = []) {
        this.#chance = Chance()

        this.#invConfigs = invConfigs
        this.#questConfigs = questConfigs
        this.#cachedQuests = [...globalQuests]
        this.#cachedPools = [...globalPools]
    }

    async step(day) {
        this.#dayData[day] = {
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
        const router = new Router(this.#cachedQuests, this.#cachedPools)

        // Every X days - keep creating quests
        this.simulateKeepCreatingQuest(day)

        // Every X days - buy/sell top gainers/increased or decreased in prices
        this.simulateTrade(day, router)

        // Every X days - withdraw X in USDC value
        this.simulateWithdraw(day, router)

        return this.#dayData[day]
    }

    simulateQuestCreation(investor, day, questType) {
        const questConfig = this.#questConfigs.find(
            (quest) => quest.questGenAlias === questType
        )

        const questProbs = this.calculateQuestProbabilities(questConfig)

        const { pool, quest } = this.initializeQuest(questConfig, day, investor)

        // Initial investment
        if (
            questConfig.initialAuthorInvest > 0 &&
            investor.balances[this.#DEFAULT_TOKEN] <
                questConfig.initialAuthorInvest
        ) {
            console.log(
                `${investor.name} Ran out of USDC, cannot invest and cite further`
            )
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
        const questSum = this.#cachedQuests.length
        const { pool, quest } = this.spawnQuest(
            investor,
            `${questConfig.questGenName} (${questSum + 1})`,
            questConfig.poolSizeTokens
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
            price: pool.currentPrice,
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
        investor.addBalance(this.#DEFAULT_TOKEN, totalIn)
        investor.addBalance(quest.name, totalOut)
        console.log(investor.name, totalIn, totalOut, investor.balances)
    }

    citeSingleQuest(questConfig, day, pool, quest, investor) {
        const singleQuest = this.#cachedQuests.find(
            (q) => q.name === questConfig.citeSingleName
        )
        if (!singleQuest) {
            return
        }

        const citeSingleAmount = this.calculateCiteAmount(
            investor,
            quest.name,
            questConfig.singleCitePerc
        )

        if (citeSingleAmount) {
            const singleUsdcPool = this.#cachedPools.find(
                (pool) =>
                    pool.tokenLeft === this.#DEFAULT_TOKEN &&
                    pool.tokenRight === singleQuest.name
            )

            if (!singleUsdcPool) {
                return
            }

            console.log(pool.name, pool)
            console.log(singleUsdcPool.name, singleUsdcPool)
            const priceRange = investor.calculatePriceRange(
                pool,
                singleUsdcPool
            )

            let citedSinglePool = this.#cachedPools.find(
                (pool) =>
                    pool.tokenLeft === singleQuest.name &&
                    pool.tokenRight === quest.name
            )

            if (!citedSinglePool) {
                citedSinglePool = investor.createPool(singleQuest, quest)
                this.#dayData[day].actions.push({
                    pool: citedSinglePool.name,
                    investorHash: investor.hash,
                    action: 'CREATED',
                    day
                })
            }
            this.#dayData[day].pools.push(citedSinglePool)

            const [totalIn, totalOut] = investor.citeQuest(
                citedSinglePool,
                singleQuest,
                quest,
                priceRange.min,
                priceRange.max,
                citeSingleAmount,
                0
            )

            this.#dayData[day].actions.push({
                pool: citedSinglePool.name,
                price: pool.currentPrice,
                investorHash: investor.hash,
                action: 'CITED',
                totalAmountIn: citeSingleAmount.toFixed(3),
                day
            })

            investor.addBalance(quest.name, -totalIn)

            this.#cachedPools.push(citedSinglePool)
            this.#dayData[day]['pools'].push(citedSinglePool)
        }
    }

    citeRandomQuests(questConfig, day, pool, quest, investor, questProbs) {
        const filteredQuests = this.#cachedQuests.filter(
            (questIter) =>
                questIter.name !== this.#DEFAULT_TOKEN &&
                questIter.name !== quest.name
        )
        const randomQuests = this.getRandomElements(
            filteredQuests,
            questProbs.citeOtherQuantity
        )

        console.log(
            'failure',
            quest.name,
            'would cite',
            randomQuests,
            'balance',
            investor.balances[quest.name]
        )

        if (randomQuests.length) {
            randomQuests.forEach((randomQuest) => {
                const citeOtherAmount = this.calculateCiteAmount(
                    investor,
                    quest.name,
                    questConfig.otherCitePerc,
                    questProbs.citeOtherQuantity
                )

                const citedPool = this.#cachedPools.find(p => p.isQuest() && p.tokenRight === randomQuest.name)

                if (!citedPool || citedPool.name === pool.name) {
                    console.log(
                        `Could not find pool for citing, wanted ${randomQuest.name} got`,
                        citedPool
                    )
                    return
                }

                console.log(pool.name, pool)
                console.log(citedPool.name, citedPool)
                const priceRange = investor.calculatePriceRange(pool, citedPool)

                let crossPool = this.#cachedPools.find(
                    (pool) =>
                        pool.tokenLeft === randomQuest.name &&
                        pool.tokenRight === quest.name
                )

                if (!crossPool) {
                    crossPool = investor.createPool(randomQuest, quest)
                    this.#dayData[day].actions.push({
                        pool: crossPool.name,
                        investorHash: investor.hash,
                        action: 'CREATED',
                        day
                    })
                }
                this.#dayData[day].pools.push(crossPool)

                const [totalIn, totalOut] = investor.citeQuest(
                    crossPool,
                    randomQuest,
                    quest,
                    priceRange.min,
                    priceRange.max,
                    citeOtherAmount
                )

                console.log(
                    'Failing here',
                    questProbs,
                    investor,
                    citeOtherAmount,
                    priceRange,
                    crossPool.name
                )

                this.#dayData[day].actions.push({
                    pool: crossPool.name,
                    price: crossPool.currentPrice,
                    investorHash: investor.hash,
                    action: 'CITED',
                    totalAmountIn: citeOtherAmount.toFixed(3),
                    day
                })
                investor.addBalance(quest.name, -totalIn)

                this.#cachedPools.push(crossPool)
                this.#dayData[day]['pools'].push(crossPool)
            })
        }
    }

    simulateKeepCreatingQuest(day) {
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
    }

    simulateTrade(day, router) {
        const tradingDayKeys = Object.keys(this.tradingInvs)
        tradingDayKeys.forEach((dayKey) => {
            // start day should be 0 so spawn day is included
            if (day % dayKey === 0) {
                const investors = this.tradingInvs[dayKey]
                investors.forEach((investorObj, idx) => {
                    const investor = investorObj.investor
                    const conf = investorObj.conf

                    // Buy in specific quest
                    if (conf.includeSingleName.length && conf.buySinglePerc) {
                        const spendAmount =
                            (investor.balances[this.#DEFAULT_TOKEN] / 100) *
                            conf.buySinglePerc

                        const tradePool = this.#cachedPools.find(
                            (pool) =>
                                pool.isQuest() &&
                                pool.tokenRight === conf.includeSingleName
                        )

                        const t0 = performance.now()
                        const [totalIn, totalOut] = router.smartSwap(
                            this.#DEFAULT_TOKEN,
                            tradePool.tokenRight,
                            spendAmount
                        )
                        const t1 = performance.now()
                        console.log(
                            `Invested directly in ${
                                conf.includeSingleName
                            } amount ${spendAmount} in ${t1 - t0}ms`
                        )

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
                                `Bad trade at: ${tradePool.name} ${totalIn} ${totalOut} ${spendAmount}`
                            )
                            console.log(
                                tradePool.currentLiquidity,
                                tradePool.currentPrice,
                                investor.balances,
                                router.getPaths(),
                                router.getSwaps()
                            )
                            console.log(tradePool)
                            return
                        }
                        this.#processSwapData(investor, router.getSwaps(), day)
                        investor.addBalance(tradePool.tokenLeft, totalIn)
                        investor.addBalance(tradePool.tokenRight, totalOut)
                    }

                    // Buy top gainers/random
                    if (
                        conf.buySumPerc &&
                        conf.buyGainerPerc &&
                        conf.buyQuestPerc
                    ) {
                        const spendAmount =
                            (investor.balances[this.#DEFAULT_TOKEN] / 100) *
                            conf.buySumPerc

                        const tradePools = this.getTradePools(
                            conf.buyQuestPerc,
                            conf.buyGainerPerc,
                            conf.excludeSingleName
                        )

                        if (!tradePools.length) {
                            return
                        }

                        const perPoolAmt = spendAmount / tradePools.length
                        if (perPoolAmt <= 0 || router.isZero(perPoolAmt)) {
                            console.log(`Per pool is ${perPoolAmt}`)
                            return
                        }

                        tradePools.forEach((pool) => {
                            const t0 = performance.now()
                            const [totalIn, totalOut] = router.smartSwap(
                                this.#DEFAULT_TOKEN,
                                pool.tokenRight,
                                perPoolAmt
                            )
                            const t1 = performance.now()
                            console.log(
                                `Traded top gainer in ${
                                    pool.name
                                } amount ${perPoolAmt} in ${t1 - t0}ms`
                            )

                            // collect pool price movements here and in other calls of router.smartSwap
                            this.storeTradedPool(day, pool)

                            // That would be an edge case, rare, but if happens, need to debug why
                            if (
                                router.isZero(totalIn) ||
                                totalOut <= 0 ||
                                router.isZero(totalOut) ||
                                isNaN(totalIn) ||
                                isNaN(totalOut)
                            ) {
                                console.log(
                                    `Bad trade at: ${pool.name} ${totalIn} ${totalOut} ${perPoolAmt}`
                                )
                                console.log(
                                    pool.currentLiquidity,
                                    pool.currentPrice,
                                    investor.balances,
                                    router.getPaths(),
                                    router.getSwaps()
                                )
                                tradePools.forEach((tg) => {
                                    console.table(tg)
                                })
                                return
                            }
                            this.#processSwapData(
                                investor,
                                router.getSwaps(),
                                day
                            )
                            investor.addBalance(pool.tokenLeft, totalIn)
                            investor.addBalance(pool.tokenRight, totalOut)
                        })
                    }

                    // Sell own tokens that increase/decrease in price
                    const sellPools = this.getChangedPriceQuests(
                        investor.balances,
                        conf
                    )

                    if (sellPools && sellPools.length) {
                        sellPools.forEach((poolData) => {
                            const { pool, amount } = poolData

                            const sp0 = performance.now()
                            const [totalIn, totalOut] = router.smartSwap(
                                pool.tokenRight,
                                pool.tokenLeft,
                                amount
                            )
                            const sp1 = performance.now()
                            console.log(
                                `Sold tokens on day ${day} into ${
                                    pool.name
                                } amount ${amount} in ${sp1 - sp0}ms`
                            )

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
                                console.log(
                                    pool.currentLiquidity,
                                    pool.currentPrice,
                                    investor.balances,
                                    router.getPaths(),
                                    router.getSwaps()
                                )
                                sellPools.forEach((tg) => {
                                    console.table(tg)
                                })
                                return
                            }
                            this.#processSwapData(
                                investor,
                                router.getSwaps(),
                                day
                            )
                            investor.addBalance(pool.tokenRight, totalIn)
                            investor.addBalance(pool.tokenLeft, totalOut)
                        })
                    }
                })
            }
        })
    }

    simulateWithdraw(day, router) {
        const valueSellingDayKeys = Object.keys(this.sellValueInvs)
        valueSellingDayKeys.forEach((dayKey) => {
            if (day % dayKey === 0) {
                const authors = this.sellValueInvs[dayKey]
                authors.forEach((authorObj, idx) => {
                    const author = authorObj.investor
                    const conf = authorObj.conf

                    if (conf.valueSellAmount <= 0) {
                        return
                    }

                    // Sell own value here
                    const quest = author.questsCreated[0]

                    if (!quest) {
                        return
                    }

                    const questBalance =
                        quest &&
                        author.balances[quest.name] &&
                        author.balances[quest.name] > 0
                            ? author.balances[quest.name]
                            : null

                    if (!questBalance) {
                        return
                    }

                    let totalIn = 0
                    let totalOut = 0
                    while (
                        totalOut < conf.valueSellAmount &&
                        author.balances[quest.name] > 0
                    ) {
                        const sumIn =
                            author.balances[quest.name] >= 10
                                ? 10
                                : author.balances[quest.name]

                        const t0 = performance.now()
                        const [amtIn, amtOut] = router.smartSwap(
                            quest.name,
                            this.#DEFAULT_TOKEN,
                            sumIn
                        )
                        const t1 = performance.now()
                        console.log(
                            `Widthdrawn amount ${amtOut} for ${amtIn}${
                                quest.name
                            } in ${t1 - t0}ms`
                        )

                        if (
                            isNaN(amtIn) ||
                            amtOut <= 0 ||
                            router.isZero(amtIn) ||
                            router.isZero(amtOut)
                        ) {
                            console.log(
                                `Broke out of selling own value of ${quest.name} with requested amount ${conf.valueSellAmount}, currently got ${totalIn}/${totalOut}`
                            )
                            break
                        }

                        this.#processSwapData(author, router.getSwaps(), day)

                        totalIn += amtIn
                        totalOut += amtOut
                        author.addBalance(quest.name, amtIn)
                        author.addBalance(this.#DEFAULT_TOKEN, amtOut)
                    }
                })
            }
        })
    }

    getChangedPriceQuests(invBalances, conf) {
        const invQuestPools = Object.keys(invBalances)
            .map((q) =>
                this.#cachedPools.find(
                    (cp) =>
                        cp.tokenRight === q &&
                        cp.tokenLeft === this.#DEFAULT_TOKEN
                )
            )
            .filter((x) => x)

        if (!invQuestPools || !invQuestPools.length) {
            return
        }

        let selectedPools = []
        if (this.#dailyTradedPools) {
            Object.entries(this.#dailyTradedPools)
                .filter((pd) => invQuestPools.find((ip) => ip.name === pd[0]))
                .forEach((poolData) => {
                    const data = poolData[1].slice(-7)
                    const growthRate =
                        ((data[data.length - 1].mcap - data[0].mcap) /
                            data[0].mcap) *
                        100

                    if (growthRate === 0) {
                        return
                    }

                    if (
                        (growthRate < 0 && growthRate >= conf.sellDecByPerc) ||
                        (growthRate > 0 && growthRate <= conf.sellIncByPerc)
                    ) {
                        return
                    }

                    const pool = invQuestPools.find(
                        (iqp) => iqp.name === poolData[0]
                    )
                    const tokenBalance = invBalances[pool.tokenRight]
                    const amountToSell =
                        (tokenBalance / 100) *
                        (growthRate > 0
                            ? conf.sellIncSumPerc
                            : conf.sellDecSumPerc)

                    if (
                        !amountToSell ||
                        amountToSell <= 0 ||
                        isNaN(amountToSell)
                    ) {
                        return
                    }

                    selectedPools.push({
                        pool: invQuestPools.find(
                            (iqp) => iqp.name === poolData[0]
                        ),
                        amount: amountToSell
                    })
                })
            return selectedPools
        }

        return
    }

    getTradePools(buyQuestPerc, buyGainerPerc, excludeSingleName) {
        const poolsAmount = Math.ceil(
            (this.#cachedQuests.length / 100) * buyGainerPerc
        )

        const topGainers = this.getTopGainers(buyQuestPerc, poolsAmount)

        let randomGainers = []
        if (topGainers.length < poolsAmount) {
            const randomAmountToGet = poolsAmount - topGainers.length
            console.log('no gainers, find', randomAmountToGet)
            randomGainers = this.getRandomGainers(
                buyQuestPerc,
                randomAmountToGet
            )
        }

        let finalResult = Array.prototype.concat(topGainers, randomGainers)

        if (excludeSingleName) {
            finalResult.filter(
                (pool) =>
                    pool.isQuest() &&
                    pool.tokenRight !== excludeSingleName
            )
        }

        return finalResult
    }

    getTopGainers(buyQuestPerc, poolsAmount) {
        // Collect top gainers of the last 30 days
        let gainers = []
        Object.entries(this.#dailyTradedPools).forEach((poolData) => {
            const data = poolData[1].slice(-30)
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
            .map((pdata) =>
                this.#cachedPools.find((pool) => pool.name === pdata.pool)
            )
    }

    getRandomGainers(buyQuestPerc, questsAmount) {
        const randomQuests = this.getRandomElements(
            this.#cachedQuests,
            questsAmount
        )

        if (!randomQuests.length) {
            return []
        }

        const toTradePools = randomQuests
            .map((quest) =>
                this.#cachedPools.find(
                    (pool) =>
                        pool.tokenLeft === this.#DEFAULT_TOKEN &&
                        pool.tokenRight === quest.name
                )
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
        const investor = new Investor(type, `${name} (${id})`, initialBalance)

        this.#cachedInvestors.push(investor)

        return investor
    }

    spawnQuest(investor, name, totalTokensProvisioned = null) {
        const quest = investor.createQuest(name)
        // @TODO: Could be an issue with USDC token not having all pools for trading, fix the issue first
        const pool = quest.createPool({ totalTokensProvisioned })
        this.#cachedQuests.push(quest)

        let leftSideQuest = this.#cachedQuests.find(
            (quest) => quest.name === this.#DEFAULT_TOKEN
        )
        if (leftSideQuest) {
            leftSideQuest.addPool(pool)
            this.#cachedQuests.map((quest) =>
                quest.name === leftSideQuest.name ? leftSideQuest : quest
            )
        } else {
            leftSideQuest = pool.tokenLeft
            this.#cachedQuests.push(leftSideQuest)
        }

        this.#cachedPools.push(pool)

        return { pool, quest }
    }

    calculateQuestProbabilities(questConfig) {
        const chances = {
            citeSingle: false,
            citeOther: false,
            citeOtherQuantity: 0
        }

        chances.citeSingle = this.calcProb(questConfig.probCiteSingle)
        chances.citeOther = this.calcProb(questConfig.probOtherCite)

        chances.citeOtherQuantity =
            chances.citeOther && questConfig.probOtherCite > 100
                ? Math.floor(questConfig.probOtherCite / 100)
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
            price: pool.currentPrice,
            tvl: pool.getTVL(),
            mcap: pool.getMarketCap()
        })
    }

    #processSwapData(investor, swaps, day) {
        const combSwaps = getCombinedSwaps(swaps, this.#cachedPools)
        Object.entries(combSwaps).forEach((ops) => {
            Object.entries(ops[1]).forEach((op) => {
                const pool = this.#cachedPools.find(
                    (pool) => pool.name === ops[0]
                )
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
        return this.#cachedQuests.filter((q) => q.name !== this.#DEFAULT_TOKEN)
    }

    getInvestors() {
        return this.#cachedInvestors
    }

    getPools() {
        return this.#cachedPools
    }

    getDailyTradedPools() {
        return this.#dailyTradedPools
    }
}

export default Generator
