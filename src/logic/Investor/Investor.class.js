import sha256 from 'crypto-js/sha256'
import HashMap from 'hashmap'

import Pool from '../Pool/Pool.class'
import Token from '../Quest/Token.class'
import { isZero, p2pp } from '../Utils/logicUtils'
import { watcherStore } from '../Utils/watcher'

export default class Investor {
    hash = null
    type = null
    name = null
    default = false
    balances = { USDC: 0 } // not like solidity, what's better -> balances here or in tokens
    initialBalance = 0
    positions = new HashMap()
    questsCreated = []

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
    static create(type, name, usdcBalance = 10000, _default = false) {
        const thisInvestor = new Investor()
        thisInvestor.hash = '0x' + sha256(`${name} + ${type}`)
        thisInvestor.balances.USDC = parseFloat(usdcBalance)
        thisInvestor.initialBalance = parseFloat(usdcBalance)
        thisInvestor.type = type
        thisInvestor.name = name
        thisInvestor.default = _default

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
            return false
        }

        if (isZero(balance) || balance === 0) {
            return false
        }

        if (!this.balances[tokenName]) {
            this.balances[tokenName] = 0
        }

        if (this.balances[tokenName] + balance < 0) {
            console.log(
                `You don't have ${balance} of ${tokenName} to spend, remaining amount is ${this.balances[tokenName]}`,
                msg
            )
            return false
        }

        this.balances[tokenName] += balance

        if (isZero(this.balances[tokenName])) {
            this.balances[tokenName] = 0
        }

        return true
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

        let compareToken = native ? token0Amt : token1Amt
        let diff =
            parseFloat(compareToken.toFixed(9)) !==
            parseFloat(totalIn.toFixed(9))

        // @FIXME: Saw this happening when triggering citeRandomWithPriceHigher, same investor, on the same day tried to cite twice the same crossPool with different amounts and position, last citation didn't go through
        if (diff) {
            console.log('### ALERT: CITATION ###')
            console.log(
                `During citation at ${crossPool.name} with pos[${priceMin}...${priceMax}] direction native=${native}, tokens passed token0: ${token0Amt}, token1: ${token1Amt}`
            )
            console.log(`Got response: in: ${totalIn}/out:${totalOut}`)
        }

        // watcherStore('citations', crossPool.tokenLeft, token0Amt, totalIn)
        // watcherStore('citations', crossPool.tokenRight, token1Amt, totalOut)

        if (!totalIn && !totalOut) {
            return null
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

        let unitPrice = citingQuestPool.curPrice / citedQuestPool.curPrice

        // position we're planning to open in pool B/A is B for A (native) or "on the left side" of the current price
        // B for A left position here [0.5...1(curPrice)...2] right position here A for B
        // right position min cannot be lower than curPrice, adapt if necessary
        const nativePos = baseUnitName !== baseUnitCompName

        min = nativePos ? 1 / unitPrice : unitPrice
        max = nativePos ? 1 / unitPrice : unitPrice

        // Try to correct rounding errors
        if (nativePos) {
            min -= 0.0000000000000000001
            max -= 0.0000000000000000001
        }

        const dryBuyNonNative = crossPool.dryBuy(Infinity)
        const drySellNative = crossPool.drySell(Infinity)
        const freeMoveBuy = dryBuyNonNative[0] === 0 && dryBuyNonNative[1] === 0
        const freeMoveSell = drySellNative[0] === 0 && drySellNative[1] === 0

        // If we can move for free towards requested price, set that price as current to calculate position location properly
        if (nativePos && max > crossPool.curPrice && freeMoveSell) {
            crossPool.curPrice = max
        } else if (!nativePos && min < this.curPrice && freeMoveBuy) {
            crossPool.curPrice = min
        }

        if (nativePos && max <= crossPool.curPrice) {
            min = min / multiplier
        } else if (nativePos && max > crossPool.curPrice) {
            max = crossPool.curPrice
            min = min / multiplier
        } else if (!nativePos && min >= crossPool.curPrice) {
            max = max * multiplier
        } else if (!nativePos && min < crossPool.curPrice) {
            min = crossPool.curPrice
            max = max * multiplier
        }

        return { min: min, max: max, native: nativePos }
    }
}
