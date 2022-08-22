import sha256 from 'crypto-js/sha256'
import HashMap from 'hashmap'
import Token from '../Quest/Token.class'

export default class Investor {
    id
    hash
    type
    balances = { USDC: 0 } // not like solidity, what's better -> balances here or in tokens
    positions = new HashMap()

    #canCreate = false

    constructor(id, usdcBalance = 10000, type = 'creator') {
        this.id = id
        this.hash = '0x' + sha256(`${id.toString()} + ${type}`)
        this.balances.USDC = usdcBalance
        this.type = type
        this.#canCreate = type === 'creator'
    }

    createQuest(name) {
        if (!this.#canCreate) {
            throw new Error(
                'Only investors with a type "creator" can create Quests'
            )
        }

        return new Token(name)
    }

    addBalance(tokenName, balance) {
        if (!this.balances[tokenName]) {
            this.balances[tokenName] = 0
        }

        if (this.balances[tokenName] + balance < 0) {
            throw new Error(
                `You don't have ${balance} of ${tokenName} to spend, remaining amount is ${this.balances[tokenName]}`
            )
        }

        const preResult = parseFloat(
            (this.balances[tokenName] + balance).toFixed(9)
        )

        if (preResult === 0) {
            this.balances[tokenName] = 0
        } else {
            this.balances[tokenName] += balance
        }
    }

    // How to keep a special ratio?
    openPosition(pool, priceMin, priceMax, amountLeft = 0, amountRight = 0) {
        const liquidity = pool.getLiquidityForAmounts(
            amountLeft,
            amountRight,
            Math.sqrt(priceMin),
            Math.sqrt(priceMax),
            Math.sqrt(pool.currentPrice)
        )
        pool.setPositionSingle(priceMin, liquidity)
        pool.setPositionSingle(priceMax, -liquidity)

        this.positions.set(pool.name, pool.pricePoints.values())

        return pool.getAmountsForLiquidity(
            liquidity,
            Math.sqrt(priceMin),
            Math.sqrt(priceMax),
            Math.sqrt(pool.currentPrice)
        )
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
        pool.modifyPositionSingle(priceMin, liquidity)
        pool.modifyPositionSingle(priceMax, -liquidity)

        this.positions.set(pool.name, pool.pricePoints.values())

        return pool.getAmountsForLiquidity(
            liquidity,
            Math.sqrt(priceMin),
            Math.sqrt(priceMax),
            Math.sqrt(pool.currentPrice)
        )
    }

    citeQuest(
        citingQuest,
        citedQuest,
        priceMin = 1,
        priceMax = 10,
        amountLeft = 0,
        amountRight = 0
    ) {
        // Creating value link pool
        const pool = citedQuest.createPool(citingQuest)
        citingQuest.addPool(pool)
        citedQuest.addPool(pool)

        // Set "positions" for value link pool
        this.openPosition(pool, priceMin, priceMax, amountLeft, amountRight)

        return pool
    }
}
