import sha256 from 'crypto-js/sha256'
import globalConfig from '../config.global.json' // make it a hash map
import HashMap from 'hashmap'
import UsdcToken from '../Quest/UsdcToken.class'

export default class Pool {
    name

    tokenLeft
    tokenRight

    currentLeft = -Infinity
    currentRight = Infinity
    currentPrice = globalConfig.PRICE_MIN
    currentPricePoint = globalConfig.PRICE_MIN
    currentLiquidity = 0

    totalSold = 0

    pricePoints = new HashMap()

    #type = 'VALUE_LINK'

    constructor(tokenLeft, tokenRight, startingPrice) {
        if (typeof tokenLeft !== 'object' || typeof tokenRight !== 'object')
            throw new Error('Tokens must be an instance of a Token')
        if (tokenLeft.name === tokenRight.name)
            throw new Error('Tokens should not match')

        this.tokenLeft = tokenLeft
        this.tokenRight = tokenRight

        this.id = '0x' + sha256(tokenLeft.name + '-' + tokenRight.name)
        this.name = `${tokenLeft.name}-${tokenRight.name}`

        // By shifting default price we also move the pointer to the right of the entire pool
        if (startingPrice && typeof startingPrice === 'number') {
            this.currentPrice = startingPrice
        }

        if (tokenLeft instanceof UsdcToken || tokenRight instanceof UsdcToken) {
            this.#type = 'QUEST'
        }

        this.initializePoolBoundaries()
    }

    initializePoolBoundaries() {
        // Define default price boundaries
        this.pricePoints.set(this.currentPrice, {
            liquidity: 0,
            left: -Infinity,
            right: globalConfig.PRICE_MAX
        })

        this.pricePoints.set(globalConfig.PRICE_MAX, {
            liquidity: 0,
            left: globalConfig.PRICE_MIN,
            right: Infinity
        })

        this.currentPricePoint = globalConfig.PRICE_MIN
        this.currentLeft = -Infinity
        this.currentRight = Infinity
    }

    setPositionSingle(price, liquidity) {
        this.pricePoints.forEach((position, point) => {
            // setting priceMin liquidity positions
            if (point < price && price <= position.right && liquidity > 0) {
                let newPosition = {}

                if (this.pricePoints.has(price)) {
                    newPosition = this.pricePoints.get(price)
                    newPosition.liquidity += liquidity
                } else {
                    newPosition = {
                        liquidity,
                        left: point,
                        right: position.right
                    }

                    const nextId = this.pricePoints.get(point).right
                    const next = this.pricePoints.get(nextId)

                    next.left = price
                    position.right = price

                    /**
                     * pos(c): (r: n) -> [Inf.(0).1]
                        new(n): (l: p, r: p.r) -> [0.(1).10k]
                        nxt(c+r): (l: n) -> [1.(10k).1m]
                     */

                    this.pricePoints.set(point, position)
                    this.pricePoints.set(nextId, next)
                }

                this.pricePoints.set(price, newPosition)

                // setting priceMax liquidity positions
            } else if (
                point > price &&
                position.left <= price &&
                liquidity < 0
            ) {
                let newPosition = {}

                if (this.pricePoints.has(price)) {
                    newPosition = this.pricePoints.get(price)
                    newPosition.liquidity += liquidity
                } else {
                    newPosition = {
                        liquidity,
                        left: position.left,
                        right: point
                    }

                    const next = this.pricePoints.get(point)
                    const prev = this.pricePoints.get(next.left)

                    prev.right = price
                    this.pricePoints.set(next.left, prev)

                    next.left = price
                    this.pricePoints.set(point, next)
                }

                this.pricePoints.set(price, newPosition)
            }

            if (price > this.currentLeft && price < this.currentPricePoint) {
                this.currentLeft = price
            }

            if (price > this.currentPricePoint && price < this.currentRight) {
                this.currentRight = price
            }
        })
    }

    // Remove liquidity partially/fully
    modifyPositionSingle(price, liquidity) {
        if (!this.pricePoints.has(price)) {
            return
        }

        let newPosition = {}
        const point = this.pricePoints.get(price)
        const removeAllLiq =
            Math.abs(liquidity) >= Math.abs(point.liquidity) ? true : false

        if (!removeAllLiq) {
            newPosition = this.pricePoints.get(price)
            newPosition.liquidity -= liquidity

            this.pricePoints.set(price, newPosition)
        } else {
            const nextId = this.pricePoints.get(price).right
            const next = this.pricePoints.get(nextId)
            const prevId = this.pricePoints.get(price).left
            const prev = this.pricePoints.get(prevId)

            next.left = prevId
            prev.right = nextId

            this.pricePoints.set(nextId, next)
            this.pricePoints.set(prevId, prev)
            this.pricePoints.delete(price)
        }
    }

    getLiquidityForAmounts(
        amount0,
        amount1,
        sqrtPriceMin,
        sqrtPriceMax,
        currentSqrtPrice
    ) {
        const liquidity0 = amount0 / (1 / sqrtPriceMin - 1 / sqrtPriceMax)
        const liquidity1 = amount1 / (currentSqrtPrice - sqrtPriceMin)

        if (currentSqrtPrice <= sqrtPriceMin) {
            return liquidity0
        } else if (currentSqrtPrice < sqrtPriceMax) {
            return Math.min(liquidity0, liquidity1)
        }

        return liquidity1
    }

    getAmountsForLiquidity(
        liquidity,
        sqrtPriceMin,
        sqrtPriceMax,
        curSqrtPrice
    ) {
        const clampedPrice = Math.max(
            Math.min(curSqrtPrice, sqrtPriceMax),
            sqrtPriceMin
        )
        // TBD: Are we sure of the order? amountLeft === amount0, e.g 5000 TK?
        const amountLeft = liquidity * (1 / clampedPrice - 1 / sqrtPriceMax)
        const amountRight = liquidity * (clampedPrice - sqrtPriceMin)

        return [amountLeft, amountRight] // one can be zero if current price outside the range
    }

    buy(amount) {
        let totalAmountIn = 0,
            totalAmountOut = 0

        let nextPricePoint

        let currentLiquidity
        let arrivedAtSqrtPrice = Math.sqrt(this.currentPrice)

        let journal = []
        let i = 0

        // while have stuff to sell, and not out of bounds and arrived at next price point to calculate next chunk of swap
        do {
            journal[i] = []

            nextPricePoint = this.currentRight
            // sets local variable from global variable (global changes on each cycle)
            currentLiquidity = this.currentLiquidity
            arrivedAtSqrtPrice += amount / currentLiquidity

            journal[i].push(`Current price: ${this.currentPrice}`)
            journal[i].push(
                `Current left/right: ${this.currentLeft}/${this.currentRight}`
            )
            journal[i].push(`Next price point: ${nextPricePoint}`)
            journal[i].push(`Current liquidity: ${currentLiquidity}`)
            journal[i].push(`New arrived b4 cap at ${i}: ${arrivedAtSqrtPrice}`)

            if (arrivedAtSqrtPrice >= Math.sqrt(nextPricePoint)) {
                arrivedAtSqrtPrice = Math.sqrt(nextPricePoint)
                journal[i].push(
                    `Arrived price is higher/equal than nextPricePoint, capping at ${arrivedAtSqrtPrice}`
                )
                this.currentLiquidity +=
                    this.pricePoints.get(nextPricePoint).liquidity * 1
                this.currentRight = this.pricePoints.get(nextPricePoint).right
                this.currentLeft = this.pricePoints.get(nextPricePoint).left
                this.currentPricePoint = nextPricePoint
                journal[i].push(`Next liquidity: ${this.currentLiquidity}`)
                journal[i].push(
                    `Next left/right: ${this.currentLeft}/${this.currentRight}`
                )
                journal[i].push(`WILL MOVE TO NEXT POSITION: ${nextPricePoint}`)
            }

            journal[i].push(
                `Calculating amount0: ${currentLiquidity} * ${arrivedAtSqrtPrice} - ${Math.sqrt(
                    this.currentPrice
                )}`
            )
            let amount0UntilNextPrice =
                currentLiquidity *
                (arrivedAtSqrtPrice - Math.sqrt(this.currentPrice))
            journal[i].push(
                `Calculating amount1: ${currentLiquidity} * 1/${arrivedAtSqrtPrice} - 1/${Math.sqrt(
                    this.currentPrice
                )}`
            )
            let amount1UntilNextPrice =
                currentLiquidity *
                (1 / arrivedAtSqrtPrice - 1 / Math.sqrt(this.currentPrice))

            journal[i].push(
                `Amount0 untilNextPrice (curLiq * (arrived - sqrt(curPrice)): ${amount0UntilNextPrice}`
            )
            journal[i].push(
                `Amount1 untilNextPrice (curLiq * (1/arrivedAtSqrtPrice - 1/sqrt(curPrice))): ${amount1UntilNextPrice}`
            )

            this.currentPrice = arrivedAtSqrtPrice ** 2
            journal[i].push(`Arrived at price (not sqrt): ${this.currentPrice}`)

            if (
                amount1UntilNextPrice === -Infinity ||
                isNaN(amount1UntilNextPrice)
            ) {
                i += 1
                continue
            }

            amount += -amount0UntilNextPrice
            journal[i].push(
                `Remaining amount after adding ${amount1UntilNextPrice}: ${amount}`
            )

            totalAmountIn += -amount0UntilNextPrice
            totalAmountOut += Math.abs(amount1UntilNextPrice)

            this.totalSold += Math.abs(amount1UntilNextPrice)

            i += 1
        } while (
            amount > 0 &&
            arrivedAtSqrtPrice === Math.sqrt(nextPricePoint) &&
            this.currentRight < globalConfig.PRICE_MAX
        )

        journal.forEach((iteration) => {
            // console.log(iteration.join('\n'));
        })

        return [totalAmountIn, totalAmountOut]
    }

    sell(amount) {
        let totalAmountIn = 0,
            totalAmountOut = 0

        let nextPricePoint
        let currentLiquidity
        let arrivedAtSqrtPrice = Math.sqrt(this.currentPrice)

        let journal = []
        let i = 0

        do {
            journal[i] = []

            nextPricePoint = this.currentPricePoint
            currentLiquidity = this.currentLiquidity
            // arrived=liq/(amt+liq/cursqrtprice)
            arrivedAtSqrtPrice =
                currentLiquidity /
                (amount + currentLiquidity / Math.sqrt(this.currentPrice))

            journal[i].push(`Iteration ${i}`)
            journal[i].push(`Current price: ${this.currentPrice}`)
            journal[i].push(
                `Current left/right: ${this.currentLeft}/${this.currentRight}`
            )
            journal[i].push(`Next price point: ${nextPricePoint}`)
            journal[i].push(`Current liquidity: ${currentLiquidity}`)
            journal[i].push(`New arrived b4 cap at ${i}: ${arrivedAtSqrtPrice}`)

            if (arrivedAtSqrtPrice <= Math.sqrt(nextPricePoint)) {
                arrivedAtSqrtPrice = Math.sqrt(nextPricePoint)
                journal[i].push(
                    `Arrived price is less/equal than nextPricePoint, capping at ${arrivedAtSqrtPrice}`
                )
                this.currentLiquidity -=
                    this.pricePoints.get(nextPricePoint).liquidity
                this.currentRight = this.pricePoints.get(nextPricePoint).right
                this.currentLeft = this.pricePoints.get(nextPricePoint).left
                this.currentPricePoint =
                    this.pricePoints.get(nextPricePoint).left
                journal[i].push(`Next liquidity: ${this.currentLiquidity}`)
                journal[i].push(
                    `Next left/right: ${this.currentLeft}/${this.currentRight}`
                )
                journal[i].push(`WILL MOVE TO NEXT POSITION: ${nextPricePoint}`)
            }

            journal[i].push(
                `Calculating amount0: ${currentLiquidity} * (1 / ${Math.sqrt(
                    this.currentPrice
                )} - (1 / ${arrivedAtSqrtPrice})`
            )
            let amount0UntilNextPrice =
                currentLiquidity *
                (1 / Math.sqrt(this.currentPrice) - 1 / arrivedAtSqrtPrice)

            journal[i].push(
                `Calculating amount1: ${currentLiquidity} * (${Math.sqrt(
                    this.currentPrice
                )} - ${arrivedAtSqrtPrice})`
            )
            let amount1UntilNextPrice =
                currentLiquidity *
                (Math.sqrt(this.currentPrice) - arrivedAtSqrtPrice)

            journal[i].push(
                `Amount0 untilNextPrice (curLiq * (1 / sqrt(curPrice) - (1 / arrivedAt)): ${amount0UntilNextPrice}`
            )
            journal[i].push(
                `Amount1 untilNextPrice (curLiq * (sqrt(curPrice) - arrivedAt)): ${amount1UntilNextPrice}`
            )

            this.currentPrice = arrivedAtSqrtPrice ** 2
            journal[i].push(`Arrived at price (not sqrt): ${this.currentPrice}`)

            if (amount0UntilNextPrice === Infinity) {
                amount0UntilNextPrice = 0
            }

            amount += amount0UntilNextPrice
            journal[i].push(
                `Remaining amount after subtracting ${amount0UntilNextPrice}: ${amount}`
            )

            totalAmountIn += Math.abs(amount1UntilNextPrice)
            totalAmountOut += amount0UntilNextPrice

            journal[i].push(
                `Total in ${totalAmountIn} / total out ${totalAmountOut}`
            )

            this.totalSold += amount0UntilNextPrice

            journal[i].push(`Total sold ${this.totalSold}`)

            i += 1
        } while (
            amount > 0.01 &&
            arrivedAtSqrtPrice === Math.sqrt(nextPricePoint) &&
            this.currentLeft >= globalConfig.PRICE_MIN
        )

        journal.forEach((iteration) => {
            // console.log(iteration.join('\n'));
        })

        return [totalAmountIn, totalAmountOut]
    }

    getType() {
        return this.#type
    }
}
