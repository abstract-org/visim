import sha256 from 'crypto-js/sha256'
import HashMap from 'hashmap'

import Pool from '../Pool/Pool.class'
import Token from '../Quest/Token.class'
import { p2pp } from '../Utils/logicUtils'

export default class Investor {
    hash = null
    type = null
    name = null
    balances = { USDC: 0 } // not like solidity, what's better -> balances here or in tokens
    positions = new HashMap()
    questsCreated = []

    #canCreate = false
    #PRICE_RANGE_MULTIPLIER = 2

    constructor(...args) {
        if (args > 0) {
            throw new Error(
                'Please instantiate Investor via Investor.create(type,name,[usdcBalance])'
            )
        }
    }

    /**
     * @description Instantiates new Investor with params
     * @param {string} type
     * @param {string} name
     * @param {number} usdcBalance
     * @returns {Investor}
     */
    static create(type, name, usdcBalance = 10000) {
        const thisInvestor = new Investor()
        thisInvestor.hash = '0x' + sha256(`${name} + ${type}`)
        thisInvestor.balances.USDC = parseFloat(usdcBalance)
        thisInvestor.type = type
        thisInvestor.name = name
        thisInvestor.#canCreate = type === 'creator'

        return thisInvestor
    }

    createQuest(name) {
        const quest = Token.create(name)
        this.questsCreated.push(quest.name)
        return quest
    }

    addBalance(tokenName, balance, msg = null) {
        if (isNaN(balance)) {
            console.log('Trying to pass NaN amount', tokenName, balance, msg)
            return
        }

        if (!this.balances[tokenName]) {
            this.balances[tokenName] = 0
        }

        const diff = parseInt(Math.abs(balance)) / balance
        //const diff = parseFloat(Math.abs(balance)) / balance
        if (diff < 1) {
            balance = Math.round(balance)
        }

        if (this.balances[tokenName] + balance < 0) {
            console.log(
                `You don't have ${balance} of ${tokenName} to spend, remaining amount is ${this.balances[tokenName]}`,
                msg
            )
            throw new Error(
                `You don't have ${balance} of ${tokenName} to spend, remaining amount is ${this.balances[tokenName]}: ${msg}`
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

    #modifyPosition(pool, priceMin, priceMax, amountLeft = 0, amountRight = 0) {
        const liquidity = pool.getLiquidityForAmounts(
            amountLeft,
            amountRight,
            Math.sqrt(priceMin),
            Math.sqrt(priceMax),
            Math.sqrt(pool.curPrice)
        )
        pool.modifyPositionSingle(p2pp(priceMin), liquidity)
        pool.modifyPositionSingle(p2pp(priceMax), -liquidity)

        this.positions.set(pool.name, pool.pos.values())

        if (pool.curPrice <= priceMax && pool.curPrice >= priceMin) {
            pool.curLiq += liquidity
        }

        const amounts = pool.getAmountsForLiquidity(
            liquidity,
            Math.sqrt(priceMin),
            Math.sqrt(priceMax),
            Math.sqrt(pool.curPrice)
        )

        pool.volumeToken0 -= amounts[0]
        pool.volumeToken1 -= amounts[1]

        return amounts
    }

    createPool(citedToken, citingToken, startingPrice) {
        if (!citedToken || !citingToken) {
            throw new Error('You must provide both tokens to create cross pool')
        }

        return Pool.create(citedToken, citingToken, startingPrice)
    }

    /**
     * @param {Object} crossPool
     * @param {number} priceMin
     * @param {number} priceMax
     * @param {number} token0Amt
     * @param {number} token1Amt
     * @returns {*[]}
     */
    citeQuest(
        crossPool,
        priceMin = 1,
        priceMax = 10,
        token0Amt = 0,
        token1Amt = 0,
        native
    ) {
        // Open "position" for value link pool
        const [totalIn, totalOut] = crossPool.openPosition(
            priceMin,
            priceMax,
            token0Amt,
            token1Amt,
            native
        )

        if (!totalIn && !totalOut) {
            return []
        }

        crossPool.posOwners.push({
            hash: this.hash,
            pmin: priceMin,
            pmax: priceMax,
            amt0: token0Amt,
            amt1: token1Amt,
            type: 'investor'
        })
        this.positions.set(crossPool.name, crossPool.pos.values())

        return [totalIn, totalOut]
    }

    /**
     * @param {Pool} crossPool
     * @param {Pool} citedQuestPool
     * @param {Pool} citingQuestPool
     * @param {number} multiplier
     * @returns {object{min: number, max: number}}
     * @description Preferred base unit of price range is B/A (cited/citing)
     */
    calculatePriceRange(
        crossPool,
        citedQuestPool,
        citingQuestPool,
        multiplier = this.#PRICE_RANGE_MULTIPLIER
    ) {
        // @TODO:
        // Replace all citeQuest with calculatePriceRange inside
        // Determine preferred token to be citing and calculate + cite with proper side accordingly
        // Replace all tests to comply
        const baseUnitName = crossPool.name
        const baseUnitCompName = `${citedQuestPool.tokenRight}-${citingQuestPool.tokenRight}`

        let min = 0
        let max = 0
        let native = true

        let unitPrice = citingQuestPool.curPrice / citedQuestPool.curPrice

        if (baseUnitName !== baseUnitCompName) {
            min = 1 / unitPrice / multiplier
            max = 1 / unitPrice
        } else {
            min = unitPrice
            max = unitPrice * multiplier
            native = false
        }

        return { min: min, max: max, native }
    }
}
