import Chance from 'chance'

import Investor from '../Investor/Investor.class'

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

    constructor(invConfigs, questConfigs) {
        this.#invConfigs = invConfigs
        this.#questConfigs = questConfigs
        this.#chance = Chance()
    }

    async step(day) {
        this.#dayData[day] = { investors: [], quests: [], pools: [] }

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

                                this.#cachedQuests.push(agoraQuest)
                                this.#cachedPools.push(agoraPool)
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

                                const citedAgoraPool = investor.createPool(
                                    agoraQuest,
                                    quest
                                )

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

                                    const crossPool = investor.createPool(
                                        randomQuest,
                                        quest
                                    )

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

                    // Before trading - daily calculation per investor probability
                    // Investor trading section
                    this.#dayData[day]['investors'].push(investor)
                } // end of inv spawner loop
            } // end of inv spawner if
        })

        return this.#dayData[day]
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

        let leftSideQuest = this.#cachedQuests.find(
            (quest) => quest.name === this.#DEFAULT_TOKEN
        )
        if (leftSideQuest) {
            leftSideQuest.addPool(pool)
        } else {
            leftSideQuest = pool.tokenLeft
        }

        if (
            !this.#cachedQuests.find(
                (quest) => quest.name === leftSideQuest.name
            )
        ) {
            this.#cachedQuests.push(leftSideQuest)
        }
        this.#cachedQuests.push(quest)
        this.#cachedPools.push(pool)

        return { quest, pool }
    }

    calculateQuestProbabilities(quest) {
        const chances = {
            citeAgora: false,
            citeOther: false,
            citeOtherQuantity: 0
        }

        chances.citeAgora = this.#chance.bool({
            likelihood: quest.probCiteAgora
        })
        chances.citeOther = this.#chance.bool({
            likelihood: quest.probOtherCite > 100 ? 100 : quest.probOtherCite
        })

        chances.citeOtherQuantity =
            chances.citeOther && quest.probOtherCite > 100
                ? Math.floor(quest.probOtherCite / 100)
                : 1

        return chances
    }

    calculateInvProbabilities(inv) {
        const chances = {
            spawnInv: false,
            spawnInvQuantity: 0
        }

        chances.spawnInv = this.#chance.bool({
            likelihood:
                inv.dailySpawnProbability > 100
                    ? 100
                    : inv.dailySpawnProbability
        })
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
