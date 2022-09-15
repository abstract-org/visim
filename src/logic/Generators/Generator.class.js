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
    #tradingInvs = {}
    #sellValueInvs = {}

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

        this.#invConfigs.forEach((inv) => {
            // Calculate probabilities
            const invProbs = this.calculateInvProbabilities(inv)
            this.#dayData[day]['invProbs'] = invProbs

            // Generate investor with config by probability
            if (invProbs.spawnInv) {
                const invSum = this.#cachedInvestors.length
                for (let i = 1; i <= invProbs.spawnInvQuantity; i++) {
                    const investor = this.spawnInvestor(
                        `${inv.invGenAlias}${invSum + 1}`,
                        inv.initialBalance
                    )
                    this.#dayData[day].investors.push(investor)
                    this.#dayData[day].actions.push({
                        investorHash: investor.hash,
                        action: 'SPAWNED',
                        day
                    })

                    const questType = inv.createQuest

                    if (questType) {
                        const questConfig = this.#questConfigs.find(
                            (quest) => quest.questGenAlias === questType
                        )

                        // Calculate probabilities
                        const questProbs =
                            this.calculateQuestProbabilities(questConfig)
                        this.#dayData[day]['questProbs'] = questProbs

                        // Generate quest by probability with config
                        const questSum = this.#cachedQuests.length
                        const { quest, pool } = this.spawnQuest(
                            investor,
                            `${questConfig.questGenAlias}${questSum + 1}`,
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

                        // Initial investment
                        if (
                            questConfig.initialAuthorInvest > 0 &&
                            investor.balances[this.#DEFAULT_TOKEN] >=
                                questConfig.initialAuthorInvest
                        ) {
                            // Smart router vs direct?
                            const [totalIn, totalOut] = pool.buy(
                                questConfig.initialAuthorInvest
                            )
                            this.#dayData[day].actions.push({
                                pool: pool.name,
                                investorHash: investor.hash,
                                action: 'BOUGHT',
                                totalAmountIn: totalIn.toFixed(2),
                                totalAmountOut: totalOut.toFixed(2),
                                day
                            })
                            this.storeTradedPool(day, pool)
                            investor.addBalance(this.#DEFAULT_TOKEN, totalIn)
                            investor.addBalance(quest.name, totalOut)
                        }

                        // Static citation section (can be any selected quest, not just "Agora")
                        if (
                            questProbs.citeSingle &&
                            questConfig.citeSingleName
                        ) {
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
                                        pool.tokenLeft.name ===
                                            this.#DEFAULT_TOKEN &&
                                        pool.tokenRight.name ===
                                            singleQuest.name
                                )

                                if (!singleUsdcPool) {
                                    return
                                }

                                const priceRange = investor.calculatePriceRange(
                                    pool,
                                    singleUsdcPool
                                )

                                let citedSinglePool = this.#cachedPools.find(
                                    (pool) =>
                                        pool.tokenLeft.name ===
                                            singleQuest.name &&
                                        pool.tokenRight.name === quest.name
                                )

                                if (!citedSinglePool) {
                                    citedSinglePool = investor.createPool(
                                        singleQuest,
                                        quest
                                    )
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
                                    priceRange.min,
                                    priceRange.max,
                                    citeSingleAmount,
                                    0
                                )
                                this.#dayData[day].actions.push({
                                    pool: citedSinglePool.name,
                                    investorHash: investor.hash,
                                    action: 'CITED',
                                    totalAmountIn: citeSingleAmount.toFixed(2),
                                    day
                                })

                                investor.addBalance(quest.name, -totalIn)

                                this.#cachedPools.push(citedSinglePool)
                                this.#dayData[day]['pools'].push(
                                    citedSinglePool
                                )
                            }
                        }

                        if (
                            questProbs.citeOther &&
                            questProbs.citeOtherQuantity > 0
                        ) {
                            const filteredQuests = this.#cachedQuests.filter(
                                (questIter) =>
                                    questIter.name !== this.#DEFAULT_TOKEN &&
                                    questIter.name !== quest.name
                            )
                            const randomQuests = this.getRandomElements(
                                filteredQuests,
                                questProbs.citeOtherQuantity
                            )

                            if (randomQuests) {
                                randomQuests.forEach((randomQuest) => {
                                    const citeOtherAmount =
                                        this.calculateCiteAmount(
                                            investor,
                                            quest.name,
                                            questConfig.otherCitePerc,
                                            questProbs.citeOtherQuantity
                                        )

                                    const findName = `${this.#DEFAULT_TOKEN}-${
                                        randomQuest.name
                                    }`
                                    const citedPool = this.#cachedPools.find(
                                        (pool) => pool.name === findName
                                    )

                                    const priceRange =
                                        investor.calculatePriceRange(
                                            pool,
                                            citedPool
                                        )

                                    let crossPool = this.#cachedPools.find(
                                        (pool) =>
                                            pool.tokenLeft.name ===
                                                randomQuest.name &&
                                            pool.tokenRight.name === quest.name
                                    )

                                    if (!crossPool) {
                                        crossPool = investor.createPool(
                                            randomQuest,
                                            quest
                                        )
                                        this.#dayData[day].actions.push({
                                            pool: crossPool.name,
                                            investorHash: investor.hash,
                                            action: 'CREATED',
                                            day
                                        })
                                    }
                                    this.#dayData[day].pools.push(crossPool)

                                    const [totalIn, totalOut] =
                                        investor.citeQuest(
                                            crossPool,
                                            priceRange.min,
                                            priceRange.max,
                                            citeOtherAmount
                                        )

                                    this.#dayData[day].actions.push({
                                        pool: crossPool.name,
                                        investorHash: investor.hash,
                                        action: 'CITED',
                                        totalAmountIn:
                                            citeOtherAmount.toFixed(2),
                                        day
                                    })
                                    investor.addBalance(quest.name, -totalIn)

                                    this.#cachedPools.push(crossPool)
                                    this.#dayData[day]['pools'].push(crossPool)
                                })
                            }
                        }
                    }

                    this.#dayData[day]['investors'].push(investor)

                    // Buy/sell investors every X days
                    if (parseInt(inv.buySellPeriodDays) > 0) {
                        if (!this.#tradingInvs[inv.buySellPeriodDays]) {
                            this.#tradingInvs[inv.buySellPeriodDays] = []
                        }

                        this.#tradingInvs[inv.buySellPeriodDays].push({
                            investor,
                            conf: inv
                        })
                    }

                    // Sell own value up to X every Y days
                    if (parseInt(inv.valueSellEveryDays) > 0) {
                        if (!this.#sellValueInvs[inv.valueSellEveryDays]) {
                            this.#sellValueInvs[inv.valueSellEveryDays] = []
                        }

                        this.#sellValueInvs[inv.valueSellEveryDays].push({
                            investor,
                            conf: inv
                        })
                    }
                } // end of inv spawner loop
            } // end of inv spawner if
        })

        //
        const router = new Router(this.#cachedQuests, this.#cachedPools)

        // Every X days - buy by investors
        const tradingDayKeys = Object.keys(this.#tradingInvs)
        tradingDayKeys.forEach((dayKey) => {
            if (day % dayKey === 0) {
                const investors = this.#tradingInvs[dayKey]
                investors.forEach((investorObj, idx) => {
                    const investor = investorObj.investor
                    const conf = investorObj.conf

                    if (
                        conf.buySumPerc <= 0 ||
                        conf.buyGainerPerc <= 0 ||
                        conf.buyQuestPerc <= 0
                    ) {
                        return
                    }

                    const spendAmount =
                        (investor.balances[this.#DEFAULT_TOKEN] / 100) *
                        conf.buySumPerc

                    // Should be calculated before the loop?
                    const topGainers = this.getTopGainers(
                        conf.buyQuestPerc,
                        conf.buyGainerPerc,
                        conf.excludeSingleName
                    )

                    if (!topGainers) {
                        return
                    }

                    const perPoolAmt = spendAmount / topGainers.length
                    if (perPoolAmt <= 0 || router.isZero(perPoolAmt)) {
                        console.log(`Per pool is ${perPoolAmt}`)
                        return
                    }

                    topGainers.forEach((pool) => {
                        const [totalIn, totalOut] = router.smartSwap(
                            this.#DEFAULT_TOKEN,
                            pool.tokenRight.name,
                            perPoolAmt
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
                                `Bad trade at: ${pool.name} ${totalIn} ${totalOut} ${perPoolAmt}`
                            )
                            console.log(
                                pool.currentLiquidity,
                                pool.currentPrice,
                                investor.balances,
                                router.getPaths(),
                                router.getSwaps()
                            )
                            topGainers.forEach((tg) => {
                                console.table(tg)
                            })
                            return
                        }
                        this.#processSwapData(investor, router.getSwaps(), day)
                        investor.addBalance(pool.tokenLeft.name, totalIn)
                        investor.addBalance(pool.tokenRight.name, totalOut)
                    })

                    // Sell own tokens
                    const sellPools = this.getChangedPriceQuests(
                        investor.balances,
                        conf
                    )

                    if (sellPools && sellPools.length) {
                        sellPools.forEach((poolData) => {
                            const { pool, amount } = poolData

                            const [totalIn, totalOut] = router.smartSwap(
                                pool.tokenRight.name,
                                pool.tokenLeft.name,
                                amount
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
                                    `[selling] Bad trade at: ${pool.name} ${totalIn} ${totalOut} ${perPoolAmt}`
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
                            investor.addBalance(pool.tokenRight.name, totalIn)
                            investor.addBalance(pool.tokenLeft.name, totalOut)
                        })
                    }
                })
            }
        })

        // Increased in price:
        // Store pool and their price direction by day
        // Take last 7 entries of price and see if it always went up
        const valueSellingDayKeys = Object.keys(this.#sellValueInvs)
        valueSellingDayKeys.forEach((dayKey) => {
            if (day % dayKey === 0) {
                const authors = this.#sellValueInvs[dayKey]
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
                        const [amtIn, amtOut] = router.smartSwap(
                            quest.name,
                            this.#DEFAULT_TOKEN,
                            sumIn
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

        return this.#dayData[day]
    }

    getChangedPriceQuests(invBalances, conf) {
        const invQuestPools = Object.keys(invBalances)
            .map((q) =>
                this.#cachedPools.find(
                    (cp) =>
                        cp.tokenRight.name === q &&
                        cp.tokenLeft.name === this.#DEFAULT_TOKEN
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
                    const tokenBalance = invBalances[pool.tokenRight.name]
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

    getTopGainers(buyQuestPerc, buyGainerPerc, excludeSingleName) {
        // Get random pools to invest in if there's no trading history for at least 30 days
        if (!this.#dailyTradedPools.length && !this.#dayData[30]) {
            const questsAmount = Math.ceil(
                (this.#cachedQuests.length / 100) * buyGainerPerc
            )

            const quests = excludeSingleName
                ? this.#cachedQuests.filter(
                      (quest) => quest.name !== excludeSingleName
                  )
                : this.#cachedQuests

            const randomQuests = this.getRandomElements(quests, questsAmount)

            if (!randomQuests) {
                return
            }

            const toTradePools = randomQuests
                .map((quest) =>
                    this.#cachedPools.find(
                        (pool) =>
                            pool.tokenLeft.name === this.#DEFAULT_TOKEN &&
                            pool.tokenRight.name === quest.name
                    )
                )
                .filter((x) => x)
            const poolsAmount = Math.ceil(
                (toTradePools.length / 100) * buyQuestPerc
            )

            return this.getRandomElements(toTradePools, poolsAmount)
        }

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

        const poolsAmount = Math.ceil((gainers.length / 100) * buyGainerPerc)

        if (!poolsAmount) return

        const topGainersSelected = this.getRandomElements(gainers, poolsAmount)

        if (!topGainersSelected) return

        const investInAmount =
            Math.ceil(topGainersSelected.length / 100) * buyQuestPerc

        if (!investInAmount) return

        const selectedGainers = this.getRandomElements(
            topGainersSelected,
            investInAmount
        )

        if (!selectedGainers) return

        return selectedGainers
            .filter((x) => x)
            .map((pdata) =>
                this.#cachedPools.find((pool) => pool.name === pdata.pool)
            )
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

    spawnInvestor(alias, initialBalance) {
        const invSum = this.#cachedInvestors.length
        const nextId = invSum + 1
        const investor = new Investor(nextId, initialBalance, alias)

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

        return { quest, pool }
    }

    calculateQuestProbabilities(quest) {
        const chances = {
            citeSingle: false,
            citeOther: false,
            citeOtherQuantity: 0
        }

        chances.citeSingle = this.calcProb(quest.probCiteSingle)
        chances.citeOther = this.calcProb(quest.probOtherCite)

        chances.citeOtherQuantity =
            chances.citeOther && quest.probOtherCite > 100
                ? Math.floor(quest.probOtherCite / 100)
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
            return
        }

        if (n > len) {
            n = len - 1
        }

        while (n--) {
            const x = Math.floor(Math.random() * len)
            result[n] = arr[x in taken ? taken[x] : x]
            taken[x] = --len in taken ? taken[len] : len
        }

        return result
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
