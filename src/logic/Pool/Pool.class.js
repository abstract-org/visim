import sha256 from 'crypto-js/sha256'
// make it a hash map
import HashMap from 'hashmap'

import UsdcToken from '../Quest/UsdcToken.class'
import { p2pp, pp2p } from '../Utils/logicUtils'
import globalConfig from '../config.global.json'

let pp

export default class Pool {
    name

    tokenLeft
    tokenRight

    currentLeft = p2pp(globalConfig.PRICE_MIN)
    currentRight = p2pp(globalConfig.PRICE_MAX)
    currentPrice = 1
    currentPricePoint = Math.log2(1)
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

        pp = this.pricePoints
    }

    initializePoolBoundaries() {
        // Define default price boundaries
        this.pricePoints.set(p2pp(globalConfig.PRICE_MIN), {
            // starts with PRICE_MIN
            liquidity: 0,
            left: p2pp(globalConfig.PRICE_MIN),
            pp: p2pp(globalConfig.PRICE_MIN),
            right: this.currentPricePoint
        })

        this.pricePoints.set(this.currentPricePoint, {
            // starts with PRICE_MIN
            liquidity: 0,
            left: p2pp(globalConfig.PRICE_MIN),
            pp: this.currentPricePoint,
            right: p2pp(globalConfig.PRICE_MAX)
        })

        this.pricePoints.set(p2pp(globalConfig.PRICE_MAX), {
            liquidity: 0,
            left: this.currentPricePoint,
            pp: p2pp(globalConfig.PRICE_MAX),
            right: p2pp(globalConfig.PRICE_MAX)
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
                        pp: price,
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
                        pp: price,
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
        tokenAamount,
        tokenBamount,
        sqrtPriceMin,
        sqrtPriceMax,
        currentSqrtPrice
    ) {
        // if you change sides - change sides in the formula or price (e.g 1/10000, 1)
        // if changing direction of pool, math won't work: prices are directional
        //      so need to either swap tokens in the math functions,
        //      or swap prices given to these functions to 1/price

        const liquidity0 = tokenAamount / (1 / sqrtPriceMin - 1 / sqrtPriceMax)
        const liquidity1 = tokenBamount / (currentSqrtPrice - sqrtPriceMin)

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
        const tokenAamount = liquidity * (1 / clampedPrice - 1 / sqrtPriceMax)
        const tokenBamount = liquidity * (clampedPrice - sqrtPriceMin)

        return [tokenAamount, tokenBamount] // one can be zero if current price outside the range
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
        let nextPriceTarget

        let currentLiquidity
        let arrivedAtSqrtPrice = Math.sqrt(this.currentPrice)

        let journal = []
        let i = 0

        // while have stuff to sell, and not out of bounds and arrived at next price point to calculate next chunk of swap
        do {
            journal[i] = []

            nextPricePoint = this.currentRight
            nextPriceTarget =
                priceLimit && pp2p(nextPricePoint) > priceLimit
                    ? priceLimit
                    : pp2p(nextPricePoint)

            // sets local variable from global variable (global changes on each cycle)
            currentLiquidity = this.currentLiquidity

            arrivedAtSqrtPrice += amount / currentLiquidity

            journal[i].push(`Op: buy ${i}`)
            journal[i].push(`Current price point: ${this.currentPricePoint}`)
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
                `Next price shift: ${nextPriceTarget} (${Math.sqrt(
                    nextPriceTarget
                )})`
            )
            journal[i].push(`Arrived price before cap: ${arrivedAtSqrtPrice}`)

            if (arrivedAtSqrtPrice > Math.sqrt(nextPriceTarget)) {
                arrivedAtSqrtPrice = Math.sqrt(nextPriceTarget)
            }

            journal[i].push(`Arrived price after cap: ${arrivedAtSqrtPrice}`)
            journal[i].push('---')

            if (
                Math.sqrt(nextPriceTarget) >= Math.sqrt(pp2p(nextPricePoint)) &&
                arrivedAtSqrtPrice >= Math.sqrt(nextPriceTarget)
            ) {
                journal[i].push(
                    `Arrived price is >= than ${
                        arrivedAtSqrtPrice >= Math.sqrt(nextPriceTarget)
                            ? 'nextPriceTarget'
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

            this.totalSold += Math.abs(amount1UntilNextPrice)

            i += 1
        } while (
            amount > 0 &&
            arrivedAtSqrtPrice === Math.sqrt(pp2p(nextPricePoint)) &&
            this.currentRight < p2pp(globalConfig.PRICE_MAX)
        )

        if (globalConfig.JOURNAL && globalConfig.JOURNAL_BUY) {
            journal.forEach((iteration) => {
                console.log(iteration.join('\n'))
            })
        }

        return [totalAmountIn, totalAmountOut]
    }

    sell(amount, priceLimit = null) {
        let totalAmountIn = 0,
            totalAmountOut = 0

        let nextPricePoint = this.currentRight
        let nextPriceTarget
        let currentLiquidity
        let arrivedAtSqrtPrice = Math.sqrt(2 ** this.currentRight)

        let journal = []
        let i = 0

        while (
            amount > 0 &&
            arrivedAtSqrtPrice === Math.sqrt(pp2p(nextPricePoint)) &&
            this.currentPricePoint > p2pp(globalConfig.PRICE_MIN)
        ) {
            journal[i] = []

            nextPricePoint = this.currentPricePoint
            nextPriceTarget =
                priceLimit && pp2p(nextPricePoint) < priceLimit
                    ? priceLimit
                    : pp2p(nextPricePoint)

            currentLiquidity = this.currentLiquidity
            // newprice = currentprice + amount/curliq

            arrivedAtSqrtPrice =
                currentLiquidity /
                (amount + currentLiquidity / Math.sqrt(this.currentPrice))

            // arrived

            journal[i].push(`Op: sell ${i}`)
            journal[i].push(
                `Bottom (current for buy) price point: ${
                    this.currentPricePoint
                } (${pp2p(this.currentPricePoint)})`
            )
            journal[i].push(
                `Current price: ${this.currentPrice} (sqrt ${Math.sqrt(
                    this.currentPrice
                )})`
            )
            journal[i].push(`Current liquidity: ${currentLiquidity}`)
            journal[i].push(
                `Current left/right: ${this.currentLeft} (${pp2p(
                    this.currentLeft
                )})/${this.currentRight} (${pp2p(this.currentRight)})`
            )
            journal[i].push('---')
            journal[i].push(
                `Next price point: ${nextPricePoint} (${pp2p(nextPricePoint)})`
            )
            journal[i].push(`Next price shift: ${nextPriceTarget}`)
            journal[i].push('---')
            journal[i].push(
                `Arrived price before cap: ${arrivedAtSqrtPrice} (${
                    arrivedAtSqrtPrice ** 2
                })`
            )

            if (arrivedAtSqrtPrice < Math.sqrt(nextPriceTarget)) {
                arrivedAtSqrtPrice = Math.sqrt(nextPriceTarget)
            }

            journal[i].push(
                `Arrived price after cap: ${arrivedAtSqrtPrice} (${
                    arrivedAtSqrtPrice ** 2
                })`
            )
            journal[i].push('---')

            if (
                Math.sqrt(nextPriceTarget) <= Math.sqrt(pp2p(nextPricePoint)) &&
                arrivedAtSqrtPrice <= Math.sqrt(nextPriceTarget)
            ) {
                journal[i].push(
                    `Arrived price is <= than ${
                        arrivedAtSqrtPrice <= Math.sqrt(nextPriceTarget)
                            ? 'nextPriceTarget'
                            : 'nextPricePoint'
                    }, capping at ${arrivedAtSqrtPrice} (${
                        arrivedAtSqrtPrice ** 2
                    })`
                )

                const np = this.pricePoints.get(nextPricePoint)
                journal[i].push(
                    `Next position: liq: ${np.liquidity} left: ${np.left} pp: ${np.pp} right: ${np.right}`
                )

                this.currentLiquidity -= this.pricePoints.get(
                    this.currentPricePoint
                ).liquidity

                if (this.currentLiquidity / 0.000001 < 0) {
                    this.currentLiquidity = 0
                }

                this.currentRight = this.currentPricePoint
                this.currentPricePoint = this.pricePoints.get(
                    this.currentPricePoint
                ).left
                this.currentLeft = this.pricePoints.get(
                    this.currentPricePoint
                ).left // using updated curPP

                journal[i].push(`Next liquidity: ${this.currentLiquidity}`)
                journal[i].push(
                    `Next left/right: ${this.currentLeft} (${pp2p(
                        this.currentLeft
                    )})/${this.currentRight} (${pp2p(this.currentRight)})`
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

            journal[i].push('---')
            amount += amount0UntilNextPrice
            journal[i].push(
                `Remaining amount after subtracting ${amount0UntilNextPrice}: ${amount}`
            )

            totalAmountOut += Math.abs(amount1UntilNextPrice)
            totalAmountIn += amount0UntilNextPrice

            journal[i].push(
                `Total in ${totalAmountIn} / total out ${totalAmountOut}`
            )

            this.totalSold += amount0UntilNextPrice

            if (this.totalSold < 0) {
                this.totalSold = 0
            }

            journal[i].push(`Total sold ${this.totalSold}`)

            i += 1
        }

        if (globalConfig.JOURNAL && globalConfig.JOURNAL_SELL) {
            journal.forEach((iteration) => {
                console.log(iteration.join('\n'))
            })
        }

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

    swap(amount, zeroForOne) {
        return zeroForOne ? this.buy(amount) : this.sell(amount)
    }

    drySwap(amount, zeroForOne) {
        return zeroForOne ? this.dryBuy(amount) : this.drySell(amount)
    }

    getType() {
        return this.#type
    }

    getSwapInfo(logOut = false) {
        const leftBalance = this.dryBuy(100000000000)
        const rightBalance = this.drySell(100000000000)

        if (logOut) {
            console.log(`Pool: (cited/USDC)${this.name}(citing)
            buy(amt): ${this.tokenLeft.name} in (deduct from amt), ${
                this.tokenRight.name
            } out (add to balance)
            sell(amt): ${this.tokenRight.name} in (deduct from amt), ${
                this.tokenLeft.name
            } out (add to balance)
            --
            total ${this.tokenLeft.name}: ${
                rightBalance[1] > 0 ? rightBalance[1] : 0
            }
            total ${this.tokenRight.name}: ${
                leftBalance[1] > 0 ? leftBalance[1] : 0
            }
            ---
            can buy(take in) ${Math.abs(leftBalance[0])} ${
                this.tokenLeft.name
            } for(give out) ${Math.abs(leftBalance[1])} ${this.tokenRight.name}
            can sell(give) ${Math.abs(rightBalance[1])} ${
                this.tokenLeft.name
            } for(take) ${Math.abs(rightBalance[0])} ${this.tokenRight.name}`)
        }

        return [leftBalance, rightBalance]
    }

    // @TODO: Reverse positions not implemented as of now, for citing - change the order of tokens in a pool
    // The bug was in which place the amounts are added, and how to properly look at the pool without complicating the code
    openPosition(priceMin, priceMax, tokenA = 0, tokenB = 0) {
        let amounts = []
        let amount1 = 0

        /**
         *  AB curr_price = 1
            Inv1 deposits 100A into AB pool at [1B/A....10000B/A] range
            Inv2 deposits 100B into AB pool at [1A/B...10000A/B] range, which is
            [0.0001B/A...1B/A] range
         */

        // @TODO:move to mirrored pools with buy func
        if (this.currentLiquidity === 0 && priceMin < this.currentPrice) {
            this.sell(1)
            this.currentPrice = 0
        }

        const liquidity = this.getLiquidityForAmounts(
            tokenA,
            tokenB,
            Math.sqrt(priceMin),
            Math.sqrt(priceMax),
            Math.sqrt(this.currentPrice)
        )

        this.setPositionSingle(p2pp(priceMin), liquidity)
        this.setPositionSingle(p2pp(priceMax), -liquidity)

        if (this.currentPrice <= priceMax && this.currentPrice >= priceMin) {
            this.currentLiquidity += liquidity
        }

        amounts = this.getAmountsForLiquidity(
            liquidity,
            Math.sqrt(priceMin),
            Math.sqrt(priceMax),
            Math.sqrt(this.currentPrice)
        )

        if (amount1 > 0) {
            amounts[1] = amount1
        }

        return amounts
    }
}
