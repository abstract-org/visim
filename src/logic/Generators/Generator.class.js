import Chance from 'chance'

import Investor from '../Investor/Investor.class'
import Router from '../Router/Router.class'

class Generator {
    #invConfigs = []
    #questConfigs = []
    #chance = null
    #dayData = {}
    #DEFAULT_TOKEN = 'USDC'
    #FOUNDATION_TOKEN = 'AGORA'
    #PRICE_RANGE_MULTIPLIER = 2

    #cachedInvestors = []
    #cachedQuests = []
    #cachedPools = []
    #dailyTradedPools = []
    #tradingInvs = {}
    #sellValueInvs = {}

    constructor(invConfigs, questConfigs, globalPools, globalQuests) {
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
            pools: []
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
                            console.log(
                                `Initial investment ${questConfig.initialAuthorInvest}/${totalIn}/${totalOut}`
                            )
                            console.log(typeof totalIn, typeof totalOut)
                            investor.addBalance(this.#DEFAULT_TOKEN, totalIn)
                            investor.addBalance(quest.name, totalOut)
                        }

                        // Static citation section (can be any selected quest, not just "Agora")
                        if (questProbs.citeAgora) {
                            if (
                                !this.#cachedQuests.find(
                                    (quest) =>
                                        quest.name === this.#FOUNDATION_TOKEN
                                )
                            ) {
                                const { quest: agoraQuest, pool: agoraPool } =
                                    this.spawnQuest(
                                        investor,
                                        this.#FOUNDATION_TOKEN
                                    )

                                this.#dayData[day]['quests'].push(agoraQuest)
                                this.#dayData[day]['pools'].push(agoraPool)
                            }

                            const citeAgoraAmount = this.calculateCiteAmount(
                                investor,
                                quest.name,
                                questConfig.agoraCitePerc
                            )

                            if (citeAgoraAmount) {
                                const findName = `${this.#DEFAULT_TOKEN}-${
                                    this.#FOUNDATION_TOKEN
                                }`
                                const usdcAgoraPool = this.#cachedPools.find(
                                    (pool) => pool.name === findName
                                )

                                const priceRange = investor.calculatePriceRange(
                                    pool,
                                    usdcAgoraPool
                                )

                                const agoraQuest = this.#cachedQuests.find(
                                    (quest) =>
                                        quest.name === this.#FOUNDATION_TOKEN
                                )

                                let citedAgoraPool = this.#cachedPools.find(
                                    (pool) =>
                                        pool.tokenLeft.name ===
                                            agoraQuest.name &&
                                        pool.tokenRight.name === quest.name
                                )

                                if (!citedAgoraPool) {
                                    citedAgoraPool = investor.createPool(
                                        agoraQuest,
                                        quest
                                    )
                                }

                                const [totalIn, totalOut] = investor.citeQuest(
                                    citedAgoraPool,
                                    priceRange.min,
                                    priceRange.max,
                                    citeAgoraAmount,
                                    0
                                )

                                investor.addBalance(quest.name, -totalIn)

                                this.#cachedPools.push(citedAgoraPool)
                                this.#dayData[day]['pools'].push(citedAgoraPool)
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
                                    }

                                    const [totalIn, totalOut] =
                                        investor.citeQuest(
                                            crossPool,
                                            priceRange.min,
                                            priceRange.max,
                                            citeOtherAmount
                                        )

                                    investor.addBalance(quest.name, -totalIn)

                                    this.#cachedPools.push(crossPool)
                                    this.#dayData[day]['pools'].push(crossPool)
                                })
                            }
                        }
                    }

                    this.#dayData[day]['investors'].push(investor)

                    if (parseInt(inv.buySellPeriodDays) > 0) {
                        if (!this.#tradingInvs[inv.buySellPeriodDays]) {
                            this.#tradingInvs[inv.buySellPeriodDays] = []
                        }

                        this.#tradingInvs[inv.buySellPeriodDays].push({
                            investor,
                            conf: inv
                        })
                    }

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

        // Every X days - buy/sell by investors
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
                    const topGainers = this.getTopGainers(
                        conf.buyQuestPerc,
                        conf.buyGainerPerc
                    )

                    if (!topGainers) {
                        return
                    }

                    const router = new Router(
                        this.#cachedQuests,
                        this.#cachedPools
                    )

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

                        investor.addBalance(pool.tokenLeft.name, totalIn)
                        investor.addBalance(pool.tokenRight.name, totalOut)
                        // @TODO @URG: Add investor back to its place in array to update their object
                        console.log(this.#tradingInvs[dayKey][idx].investor)
                    })
                })
            }
        })

        // Top gainers:
        // Store pool and their TVL by day
        // Take last 30 entries of TVL per pool and check if it grew or not
        // Sort top growers
        //
        // Increased in price:
        // Store pool and their price direction by day
        // Take last 7 entries of price and see if it always went up

        return this.#dayData[day]
    }

    getTopGainers(buyQuestPerc, buyGainerPerc) {
        // Get random pools to invest in if there's no trading history for at least 30 days
        if (!this.#dailyTradedPools.length && !this.#dayData[30]) {
            const questsAmount = Math.ceil(
                (this.#cachedQuests.length / 100) * buyGainerPerc
            )
            const randomQuests = this.getRandomElements(
                this.#cachedQuests.filter(
                    (quest) => quest.name !== this.#FOUNDATION_TOKEN
                ),
                questsAmount
            )

            if (!randomQuests.length) {
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
            citeAgora: false,
            citeOther: false,
            citeOtherQuantity: 0
        }

        chances.citeAgora = this.calcProb(quest.probCiteAgora)
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
        return this.#cachedQuests
    }

    getInvestors() {
        return this.#cachedInvestors
    }

    getPools() {
        return this.#cachedPools
    }
}

export default Generator
