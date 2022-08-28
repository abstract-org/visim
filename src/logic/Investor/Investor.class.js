import sha256 from 'crypto-js/sha256'
import HashMap from 'hashmap'
import Token from '../Quest/Token.class'
import Pool from '../Pool/Pool.class'

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

    openPosition(pool, priceMin, priceMax, amountLeft = 0, amountRight = 0) {
        let amounts = []
        let amount1 = 0

        // Also adding reverse position
        if (amountLeft > 0 && amountRight > 0) {
            amount1 = this.openPosition(
                pool,
                priceMin,
                priceMax,
                0,
                amountRight
            )[1]
        }

        // Adding liquidity from another side
        // [1...2] -> [0.5...1]
        if (amountLeft === 0) {
            let temp = priceMax
            priceMax = 1 / priceMin
            priceMin = 1 / temp
        }

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

        amounts = pool.getAmountsForLiquidity(
            liquidity,
            Math.sqrt(priceMin),
            Math.sqrt(priceMax),
            Math.sqrt(pool.currentPrice)
        )

        if (amount1 > 0) {
            amounts[1] = amount1
        }

        return amounts
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

    createPool(tokenLeft, tokenRight, startingPrice) {
        if (!tokenLeft || !tokenRight) {
            throw new Error('You must provide both tokens to create cross pool')
        }
        return new Pool(tokenLeft, tokenRight, startingPrice)
    }

    citeQuest(
        crossPool,
        priceMin = 1,
        priceMax = 10,
        amountLeft = 0,
        amountRight = 0
    ) {
        crossPool.tokenLeft.addPool(crossPool)
        crossPool.tokenRight.addPool(crossPool)
        // Set "positions" for value link pool
        const [totalIn, totalOut] = this.openPosition(
            crossPool,
            priceMin,
            priceMax,
            amountLeft,
            amountRight
        )
        return [totalIn, totalOut]
    }
}
