import sha256 from 'crypto-js/sha256'
import HashMap from 'hashmap'

import Pool from '../Pool/Pool.class'
import Token from '../Quest/Token.class'
import { p2pp } from '../Utils/logicUtils'

export default class Investor {
    id = null
    hash = null
    type = null
    balances = { USDC: 0 } // not like solidity, what's better -> balances here or in tokens
    positions = new HashMap()
    questsCreated = []

    #canCreate = false
    #PRICE_RANGE_MULTIPLIER = 2

    constructor(id, usdcBalance = 10000, type = 'creator') {
        this.id = id
        this.hash = '0x' + sha256(`${id.toString()} + ${type}`)
        this.balances.USDC = parseFloat(usdcBalance)
        this.type = type
        this.#canCreate = type === 'creator'
    }

    createQuest(name) {
        const quest = new Token(name)
        this.questsCreated.push(quest)
        return quest
    }

    addBalance(tokenName, balance) {
        if (isNaN(balance)) {
            console.log('Trying to pass NaN amount')
            return
        }

        if (!this.balances[tokenName]) {
            this.balances[tokenName] = 0
        }

        const diff = parseInt(Math.abs(balance)) / balance
        if (diff < 1) {
            balance = Math.round(balance)
        }

        if (this.balances[tokenName] + balance < 0) {
            throw new Error(
                `You don't have ${balance} of ${tokenName} to spend, remaining amount is ${this.balances[tokenName]}`
            )
        }

        this.balances[tokenName] += balance
    }

    removeLiquidity(pool, priceMin, priceMax, amountLeft = 0, amountRight = 0) {
        return this.#modifyPosition(
            pool,
            priceMin,
            priceMax,
            amountLeft,
            amountRight
        )
    }

    removePosition(pool, priceMin, priceMax, amountLeft = 0, amountRight = 0) {
        return this.#modifyPosition(
            pool,
            priceMin,
            priceMax,
            amountLeft,
            amountRight
        )
    }

    #modifyPosition(pool, priceMin, priceMax, amountLeft = 0, amountRight = 0) {
        const liquidity = pool.getLiquidityForAmounts(
            amountLeft,
            amountRight,
            Math.sqrt(priceMin),
            Math.sqrt(priceMax),
            Math.sqrt(pool.currentPrice)
        )
        pool.modifyPositionSingle(p2pp(priceMin), liquidity)
        pool.modifyPositionSingle(p2pp(priceMax), -liquidity)

        this.positions.set(pool.name, pool.pricePoints.values())

        if (pool.currentPrice <= priceMax && pool.currentPrice >= priceMin) {
            pool.currentLiquidity += liquidity
        }

        return pool.getAmountsForLiquidity(
            liquidity,
            Math.sqrt(priceMin),
            Math.sqrt(priceMax),
            Math.sqrt(pool.currentPrice)
        )
    }

    createPool(citedToken, citingToken, startingPrice) {
        if (!citedToken || !citingToken) {
            throw new Error('You must provide both tokens to create cross pool')
        }
        return new Pool(citedToken, citingToken, startingPrice)
    }

    citeQuest(
        crossPool,
        priceMin = 1,
        priceMax = 10,
        citingAmount = 0,
        citedAmount = 0
    ) {
        crossPool.tokenLeft.addPool(crossPool)
        crossPool.tokenRight.addPool(crossPool)

        // Set "positions" for value link pool
        const [totalIn, totalOut] = crossPool.openPosition(
            priceMin,
            priceMax,
            citingAmount,
            citedAmount
        )
        return [totalIn, totalOut]
    }

    calculatePriceRange(
        citingQuestPool,
        citedQuestPool,
        multiplier = this.#PRICE_RANGE_MULTIPLIER
    ) {
        if (!citingQuestPool.currentPrice || !citingQuestPool.currentPrice) {
            throw new Error(
                'Did you pass quest instead of a pool for citation?'
            )
        }

        const citingPrice = citingQuestPool.currentPrice
        const citedPrice = citedQuestPool.currentPrice

        let AforB = citingPrice / citedPrice
        let min = AforB < citingPrice ? AforB / multiplier : AforB
        let max = AforB >= citedPrice ? AforB * multiplier : AforB
        return { min: min, max: max }
    }
}
