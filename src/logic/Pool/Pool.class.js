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
    currentPrice = 1
    currentPricePoint = globalConfig.PRICE_MIN
    currentLiquidity = 0

    totalSold = 0

    pricePoints = new HashMap()

    #type = 'VALUE_LINK'
    #dryState = {}

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
        this.pricePoints.set(this.currentPricePoint, {
            liquidity: 0,
            left: -Infinity,
            right: globalConfig.PRICE_MAX
        })

        this.pricePoints.set(globalConfig.PRICE_MAX, {
            liquidity: 0,
            left: this.currentPricePoint,
            right: Infinity
        })
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

                    /**
                     * refactor to (TBD):
                    prev(c.l): (r: n.p) -> [-Inf.(1).1m]
                    new(n): (l: prev, r: p) -> [0.(1).1m]    
                    pos(c): (l: n) -> [1.(1ml).Inf]
                     */

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
        amountLeft,
        amountRight,
        sqrtPriceMin,
        sqrtPriceMax,
        currentSqrtPrice
    ) {
        const liquidity0 = amountLeft / (1 / sqrtPriceMin - 1 / sqrtPriceMax)
        const liquidity1 = amountRight / (currentSqrtPrice - sqrtPriceMin)

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
        const amountLeft = liquidity * (1 / clampedPrice - 1 / sqrtPriceMax)
        const amountRight = liquidity * (clampedPrice - sqrtPriceMin)

        return [amountLeft, amountRight] // one can be zero if current price outside the range
    }

    dryBuy(amount, priceLimit = null) {
        this.#dryState = {
            currentPrice: this.currentPrice,
            currentLiquidity: this.currentLiquidity,
            currentRight: this.currentRight,
            currentLeft: this.currentLeft,
            currentPricePoint: this.currentPricePoint,
            totalSold: this.totalSold
        }

        const [totalIn, totalOut] = this.buy(amount, priceLimit)

        for (const state in this.#dryState) {
            this[state] = this.#dryState[state]
        }

        this.#dryState = {}

        return [totalIn, totalOut]
    }

    buy(amount, priceLimit = null) {
        let totalAmountIn = 0,
            totalAmountOut = 0

        let nextPricePoint
        let nextPriceShift

        let currentLiquidity
        let arrivedAtSqrtPrice = Math.sqrt(this.currentPrice)

        let journal = []
        let i = 0

        // while have stuff to sell, and not out of bounds and arrived at next price point to calculate next chunk of swap
        do {
            journal[i] = []

            nextPricePoint = this.currentRight
            nextPriceShift =
                priceLimit && nextPricePoint > priceLimit
                    ? priceLimit
                    : nextPricePoint

            // sets local variable from global variable (global changes on each cycle)
            currentLiquidity = this.currentLiquidity

            if (currentLiquidity > 0) {
                arrivedAtSqrtPrice += amount / currentLiquidity
            }

            journal[i].push(`Current price: ${this.currentPrice}`)
            journal[i].push(`Current liquidity: ${currentLiquidity}`)
            journal[i].push(
                `Current left/right: ${this.currentLeft}/${this.currentRight}`
            )
            journal[i].push('---')
            journal[i].push(
                `Next price point: ${nextPricePoint} (${Math.sqrt(
                    nextPricePoint
                )})`
            )
            journal[i].push(
                `Next price shift: ${nextPriceShift} (${Math.sqrt(
                    nextPriceShift
                )})`
            )
            journal[i].push(`Arrived price before cap: ${arrivedAtSqrtPrice}`)

            if (arrivedAtSqrtPrice > Math.sqrt(nextPriceShift)) {
                arrivedAtSqrtPrice = Math.sqrt(nextPriceShift)
            }

            journal[i].push(`Arrived price after cap: ${arrivedAtSqrtPrice}`)
            journal[i].push('---')

            if (
                Math.sqrt(nextPriceShift) >= Math.sqrt(nextPricePoint) &&
                arrivedAtSqrtPrice >= Math.sqrt(nextPriceShift)
            ) {
                arrivedAtSqrtPrice = Math.sqrt(nextPriceShift)

                journal[i].push(
                    `Arrived price is >= than ${
                        arrivedAtSqrtPrice >= Math.sqrt(nextPriceShift)
                            ? 'nextPriceShift'
                            : 'nextPricePoint'
                    }, capping at ${arrivedAtSqrtPrice}`
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
                journal[i].push('!!! ---')
                journal[i].push(`WILL MOVE TO POINT: ${nextPricePoint}`)
                journal[i].push('!!! ---')
            } else {
                journal[i].push('!!! ---')
                journal[i].push(
                    `Staying with the same liquidity ${currentLiquidity}`
                )
                journal[i].push('!!! ---')
            }

            journal[i].push(
                `Calculating Amount0: ${currentLiquidity} * ${arrivedAtSqrtPrice} - ${Math.sqrt(
                    this.currentPrice
                )}`
            )
            let amount0UntilNextPrice =
                currentLiquidity *
                (arrivedAtSqrtPrice - Math.sqrt(this.currentPrice))
            journal[i].push(
                `Calculating Amount1: ${currentLiquidity} * 1/${arrivedAtSqrtPrice} - 1/${Math.sqrt(
                    this.currentPrice
                )}`
            )
            journal[i].push('---')
            let amount1UntilNextPrice =
                currentLiquidity *
                (1 / arrivedAtSqrtPrice - 1 / Math.sqrt(this.currentPrice))

            journal[i].push(
                `Amount0 (curLiq * (arrived - sqrt(curPrice)):\n ${amount0UntilNextPrice}`
            )
            journal[i].push(
                `Amount1 (curLiq * (1/arrivedAtSqrtPrice - 1/sqrt(curPrice))):\n ${amount1UntilNextPrice}`
            )
            journal[i].push('---')
            this.currentPrice = arrivedAtSqrtPrice ** 2
            journal[i].push(
                `New price: ${this.currentPrice} (${arrivedAtSqrtPrice})`
            )

            if (
                amount1UntilNextPrice === -Infinity ||
                isNaN(amount1UntilNextPrice)
            ) {
                i += 1
                continue
            }
            journal[i].push('---')
            amount += -amount0UntilNextPrice
            journal[i].push(
                `Remaining amount after paying ${amount0UntilNextPrice}: ${amount}`
            )

            totalAmountIn += -amount0UntilNextPrice
            totalAmountOut += Math.abs(amount1UntilNextPrice)

            // console.log(
            //     `Buy ${amount0UntilNextPrice}, ${amount1UntilNextPrice}`
            // )

            this.totalSold += Math.abs(amount1UntilNextPrice)

            i += 1
        } while (
            amount > 0 &&
            arrivedAtSqrtPrice === Math.sqrt(nextPricePoint) &&
            this.currentRight < globalConfig.PRICE_MAX
        )

        journal.forEach((iteration) => {
            // console.log(iteration.join('\n'))
        })

        return [totalAmountIn, totalAmountOut]
    }

    sell(amount, priceLimit = null) {
        let totalAmountIn = 0,
            totalAmountOut = 0

        let nextPricePoint
        let nextPriceShift
        let currentLiquidity
        let arrivedAtSqrtPrice = Math.sqrt(this.currentPrice)

        let journal = []
        let i = 0

        do {
            journal[i] = []

            nextPricePoint = this.currentPricePoint
            nextPriceShift =
                priceLimit && nextPricePoint < priceLimit
                    ? priceLimit
                    : nextPricePoint

            currentLiquidity = this.currentLiquidity
            // arrived=liq/(amt+liq/cursqrtprice)

            if (currentLiquidity > 0) {
                arrivedAtSqrtPrice =
                    currentLiquidity /
                    (amount + currentLiquidity / Math.sqrt(this.currentPrice))
            }

            journal[i].push(`Current price: ${this.currentPrice}`)
            journal[i].push(
                `Current left/right: ${this.currentLeft}/${this.currentRight}`
            )
            journal[i].push(`Current liquidity: ${currentLiquidity}`)
            journal[i].push('---')
            journal[i].push(`Next price point: ${nextPricePoint}`)
            journal[i].push(`Next price shift: ${nextPriceShift}`)
            journal[i].push('---')
            journal[i].push(`Arrived price before cap: ${arrivedAtSqrtPrice}`)

            if (arrivedAtSqrtPrice < Math.sqrt(nextPriceShift)) {
                arrivedAtSqrtPrice = Math.sqrt(nextPriceShift)
            }

            journal[i].push(`Arrived price after cap: ${arrivedAtSqrtPrice}`)
            journal[i].push('---')

            if (
                Math.sqrt(nextPriceShift) <= Math.sqrt(nextPricePoint) &&
                arrivedAtSqrtPrice <= Math.sqrt(nextPriceShift)
            ) {
                arrivedAtSqrtPrice = Math.sqrt(nextPriceShift)
                journal[i].push(
                    `Arrived price is <= than ${
                        arrivedAtSqrtPrice <= Math.sqrt(nextPriceShift)
                            ? 'nextPriceShift'
                            : 'nextPricePoint'
                    }, capping at ${arrivedAtSqrtPrice}`
                )
                journal[i].push(
                    `Liq check ${
                        this.pricePoints.get(nextPricePoint).liquidity
                    }`
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
                journal[i].push('!!! ---')
                journal[i].push(`WILL MOVE TO NEXT POSITION: ${nextPricePoint}`)
                journal[i].push('!!! ---')
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
            journal[i].push('---')

            journal[i].push(
                `Amount0 (curLiq * (1 / sqrt(curPrice) - (1 / arrivedAt)): ${amount0UntilNextPrice}`
            )
            journal[i].push(
                `Amount1 (curLiq * (sqrt(curPrice) - arrivedAt)): ${amount1UntilNextPrice}`
            )
            journal[i].push('---')

            this.currentPrice = arrivedAtSqrtPrice ** 2
            journal[i].push(
                `New price: ${this.currentPrice} (${Math.sqrt(
                    arrivedAtSqrtPrice
                )})`
            )

            if (amount0UntilNextPrice === Infinity) {
                amount0UntilNextPrice = 0
            }
            journal[i].push('---')
            amount += amount0UntilNextPrice
            journal[i].push(
                `Remaining amount after subtracting ${amount0UntilNextPrice}: ${amount}`
            )

            // console.log(
            //     `Sell ${amount0UntilNextPrice}, ${amount1UntilNextPrice}`
            // )

            totalAmountIn += Math.abs(amount1UntilNextPrice)
            totalAmountOut += amount0UntilNextPrice

            journal[i].push(
                `Total in ${totalAmountIn} / total out ${totalAmountOut}`
            )

            this.totalSold += amount0UntilNextPrice

            journal[i].push(`Total sold ${this.totalSold}`)

            i += 1
        } while (
            amount > 0 &&
            arrivedAtSqrtPrice === Math.sqrt(nextPricePoint) &&
            this.currentLeft >= globalConfig.PRICE_MIN
        )

        journal.forEach((iteration) => {
            // console.log(iteration.join('\n'))
        })

        return [totalAmountIn, totalAmountOut]
    }

    drySell(amount, priceLimit = null) {
        this.#dryState = {
            currentPrice: this.currentPrice,
            currentLiquidity: this.currentLiquidity,
            currentRight: this.currentRight,
            currentLeft: this.currentLeft,
            currentPricePoint: this.currentPricePoint,
            totalSold: this.totalSold
        }

        const [totalIn, totalOut] = this.sell(amount, priceLimit)

        for (const state in this.#dryState) {
            this[state] = this.#dryState[state]
        }

        this.#dryState = {}

        return [totalIn, totalOut]
    }

    getType() {
        return this.#type
    }

    getSwapInfo(logOut = false) {
        const leftBalance = this.dryBuy(100000000000)
        const rightBalance = this.drySell(100000000000)

        if (logOut) {
            console.log(`Pool: (citing)${this.name}(cited)
            buy(amt): ${this.tokenLeft.name} in (deducted), ${
                this.tokenRight.name
            } out (added)
            sell(amt): ${this.tokenRight.name} in (deducted), ${
                this.tokenLeft.name
            } out (added)
            --
            total ${this.tokenLeft.name}: ${
                Math.abs(leftBalance[0]) + Math.abs(rightBalance[0])
            }
            total ${this.tokenRight.name}: ${
                Math.abs(rightBalance[1]) + Math.abs(leftBalance[1])
            }
            ---
            can buy(take) ${Math.abs(rightBalance[0])} ${
                this.tokenLeft.name
            } for(give) ${Math.abs(rightBalance[1])} ${this.tokenRight.name}
            can sell(give) ${Math.abs(leftBalance[0])} ${
                this.tokenLeft.name
            } for(take) ${Math.abs(leftBalance[1])} ${this.tokenRight.name}`)
        }

        return [leftBalance, rightBalance]
    }
}
