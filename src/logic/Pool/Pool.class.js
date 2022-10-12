import sha256 from 'crypto-js/sha256'
// make it a hash map
import HashMap from 'hashmap'

import UsdcToken from '../Quest/UsdcToken.class'
import { p2pp, pp2p } from '../Utils/logicUtils'
import globalConfig from '../config.global.json'

// cosmetic constants to address left/right token balance
const LEFT_TOKEN = 0
const RIGHT_TOKEN = 1
// cosmetic constants to address sell/buy result array items
const TOTAL_IN = 0
const TOTAL_OUT = 1

let pp

export default class Pool {
    name

    tokenLeft
    tokenRight

    currentLeft = p2pp(globalConfig.PRICE_MIN)
    currentRight = p2pp(globalConfig.PRICE_MAX)
    currentPrice = 0
    curPP = Math.log2(1)
    currentLiquidity = 0

    totalSold = 0

    priceToken0 = 0
    priceToken1 = 0

    volumeToken0 = 0
    volumeToken1 = 0

    soldToken0 = 0
    soldToken1 = 0

    pos = new HashMap()
    posOwners = []

    type = 'VALUE_LINK'
    #dryState = {}

    constructor(...args) {
        if (args > 0) {
            throw new Error(
                'Please instantiate Pool via Pool.create(tokenLeft,tokenRight,startingPrice)'
            )
        }
    }

    /**
     * @description Instantiates new Pool with params
     * @param {Object} tokenLeft
     * @param {Object} tokenRight
     * @returns {Pool}
     */
    static create(tokenLeft, tokenRight) {
        const thisPool = new Pool()
        if (typeof tokenLeft !== 'object' || typeof tokenRight !== 'object')
            throw new Error('Tokens must be an instance of a Token')
        if (tokenLeft.name === tokenRight.name)
            throw new Error('Tokens should not match')

        thisPool.tokenLeft = tokenLeft.name
        thisPool.tokenRight = tokenRight.name

        thisPool.id = '0x' + sha256(tokenLeft.name + '-' + tokenRight.name)
        thisPool.name = `${tokenLeft.name}-${tokenRight.name}`

        if (tokenLeft instanceof UsdcToken || tokenRight instanceof UsdcToken) {
            thisPool.type = 'QUEST'
        }

        thisPool.initializePoolBoundaries()

        return thisPool
    }

    initializePoolBoundaries() {
        // Define default price boundaries
        this.pos.set(p2pp(globalConfig.PRICE_MIN), {
            // starts with PRICE_MIN
            liquidity: 0,
            left: p2pp(globalConfig.PRICE_MIN),
            pp: p2pp(globalConfig.PRICE_MIN),
            right: this.curPP
        })

        this.pos.set(this.curPP, {
            // starts with PRICE_MIN
            liquidity: 0,
            left: p2pp(globalConfig.PRICE_MIN),
            pp: this.curPP,
            right: p2pp(globalConfig.PRICE_MAX)
        })

        this.pos.set(p2pp(globalConfig.PRICE_MAX), {
            liquidity: 0,
            left: this.curPP,
            pp: p2pp(globalConfig.PRICE_MAX),
            right: p2pp(globalConfig.PRICE_MAX)
        })
    }

    setPositionSingle(price, liquidity) {
        this.pos.forEach((position, point) => {
            // setting priceMin liquidity positions
            if (point < price && price <= position.right && liquidity > 0) {
                let newPosition = {}
                if (this.pos.has(price)) {
                    newPosition = this.pos.get(price)
                    newPosition.liquidity += liquidity
                } else {
                    newPosition = {
                        liquidity,
                        left: point,
                        pp: price,
                        right: position.right
                    }

                    const nextId = this.pos.get(point).right
                    const next = this.pos.get(nextId)

                    next.left = price
                    position.right = price

                    this.pos.set(point, position)
                    this.pos.set(nextId, next)
                }

                this.pos.set(price, newPosition)

                // setting priceMax liquidity positions
            } else if (
                point > price &&
                position.left <= price &&
                liquidity < 0
            ) {
                let newPosition = {}

                if (this.pos.has(price)) {
                    newPosition = this.pos.get(price)
                    newPosition.liquidity += liquidity
                } else {
                    newPosition = {
                        liquidity,
                        left: position.left,
                        pp: price,
                        right: point
                    }

                    const next = this.pos.get(point)
                    const prev = this.pos.get(next.left)

                    prev.right = price
                    this.pos.set(next.left, prev)

                    next.left = price
                    this.pos.set(point, next)
                }

                this.pos.set(price, newPosition)
            }

            if (price > this.currentLeft && price < this.curPP) {
                this.currentLeft = price
            }

            if (price > this.curPP && price < this.currentRight) {
                this.currentRight = price
            }
        })
    }

    // Remove liquidity partially/fully
    modifyPositionSingle(price, liquidity) {
        if (!this.pos.has(price)) {
            return
        }

        let newPosition = {}
        const point = this.pos.get(price)
        const removeAllLiq = Math.abs(liquidity) >= Math.abs(point.liquidity)

        if (!removeAllLiq) {
            newPosition = this.pos.get(price)
            newPosition.liquidity -= liquidity

            this.pos.set(price, newPosition)
        } else {
            const nextId = this.pos.get(price).right
            const next = this.pos.get(nextId)
            const prevId = this.pos.get(price).left
            const prev = this.pos.get(prevId)

            next.left = prevId
            prev.right = nextId

            this.pos.set(nextId, next)
            this.pos.set(prevId, prev)
            this.pos.delete(price)
        }
    }

    /**
     * @description Opens position in the provided price range and adding provided amount of tokens into pool with calculated liquidity
     * @param {number} priceMin
     * @param {number} priceMax
     * @param {number} token0Amt
     * @param {number} token1Amt
     * @param {boolean} native
     * @returns {[number, number]}
     */
    openPosition(
        priceMin,
        priceMax,
        token0Amt = 0,
        token1Amt = 0,
        native = false
    ) {
        let amounts = []
        let amount1 = 0

        const liquidity = this.getLiquidityForAmounts(
            token0Amt,
            token1Amt,
            Math.sqrt(priceMin),
            Math.sqrt(priceMax),
            Math.sqrt(this.currentPrice)
        )

        if (liquidity === 0) {
            return []
        }

        this.volumeToken0 += token0Amt
        this.volumeToken1 += token1Amt

        this.setPositionSingle(p2pp(priceMin), liquidity)
        this.setPositionSingle(p2pp(priceMax), -liquidity)

        if (this.currentPrice >= priceMin && this.currentPrice <= priceMax) {
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

        this.setActiveLiq(priceMin, priceMax)

        return amounts
    }

    setActiveLiq(pMin, pMax) {
        if (
            this.currentLiquidity === 0 &&
            (pMin < this.currentPrice || pMax > this.currentPrice)
        ) {
            const ppNext =
                pMax > this.currentPrice ? this.seekActiveLiq('right') : null
            const ppPrev = !ppNext ? this.seekActiveLiq('left') : null

            const toPP = ppNext ? ppNext : ppPrev ? ppPrev : null

            if (toPP) {
                this.curPP = toPP.pp
                this.currentLeft = toPP.left
                this.currentRight = toPP.right
                this.currentLiquidity = toPP.liquidity
                this.currentPrice = pp2p(toPP.pp)
                this.priceToken0 = 1 / this.currentPrice
                this.priceToken1 = this.currentPrice
            }
        }
    }

    seekActiveLiq(dir) {
        let localPP = this.curPP

        while (
            this.pos.get(localPP) &&
            this.pos.get(localPP)[dir] !== 'undefined' &&
            localPP !== this.pos.get(localPP)[dir]
        ) {
            if (this.pos.get(localPP).liquidity !== 0) {
                return this.pos.get(localPP)
            }

            localPP = this.pos.get(localPP)[dir]
        }

        return null
    }

    getLiquidityForAmounts(
        token0,
        token1,
        sqrtPriceMin,
        sqrtPriceMax,
        currentSqrtPrice
    ) {
        const liquidity0 = token0 / (currentSqrtPrice - sqrtPriceMin)
        const liquidity1 = token1 / (1 / sqrtPriceMin - 1 / sqrtPriceMax)

        if (currentSqrtPrice <= sqrtPriceMin) {
            return liquidity1
        } else if (currentSqrtPrice < sqrtPriceMax) {
            return Math.min(liquidity0, liquidity1)
        }

        return liquidity0
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
        const tokenAamount = liquidity * (clampedPrice - sqrtPriceMin)
        const tokenBamount = liquidity * (1 / clampedPrice - 1 / sqrtPriceMax)

        return [tokenAamount, tokenBamount] // one can be zero if current price outside the range
    }

    dryBuy(amount, priceLimit = null) {
        this.#dryState = {
            currentPrice: this.currentPrice,
            currentLiquidity: this.currentLiquidity,
            currentRight: this.currentRight,
            currentLeft: this.currentLeft,
            curPP: this.curPP,
            totalSold: this.totalSold,
            volumeToken0: this.volumeToken0,
            volumeToken1: this.volumeToken1
        }

        const [totalIn, totalOut] = this.buy(amount, priceLimit, true)

        for (const state in this.#dryState) {
            this[state] = this.#dryState[state]
        }

        this.#dryState = {}

        return [totalIn, totalOut]
    }

    buy(amount, priceLimit = null, dry = false) {
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
            journal[i].push(`Current price point: ${this.curPP}`)
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
                    this.pos.get(nextPricePoint).liquidity * 1
                this.currentRight = this.pos.get(nextPricePoint).right
                this.currentLeft = this.pos.get(nextPricePoint).left
                this.curPP = nextPricePoint
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
            this.priceToken1 = this.currentPrice
            this.priceToken0 = 1 / this.currentPrice

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

        if (!dry) {
            this.totalSold += Math.abs(totalAmountOut)
            this.volumeToken0 += Math.abs(totalAmountIn)
            this.volumeToken1 += -totalAmountOut
        }

        return [totalAmountIn, totalAmountOut]
    }

    sell(amount, priceLimit = null, dry = false) {
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
            this.curPP > p2pp(globalConfig.PRICE_MIN)
        ) {
            journal[i] = []

            nextPricePoint = this.curPP
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
                `Bottom (current for buy) price point: ${this.curPP} (${pp2p(
                    this.curPP
                )})`
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

                const np = this.pos.get(nextPricePoint)
                journal[i].push(
                    `Next position: liq: ${np.liquidity} left: ${np.left} pp: ${np.pp} right: ${np.right}`
                )

                this.currentLiquidity -= this.pos.get(this.curPP).liquidity

                if (this.currentLiquidity / 0.000001 < 0) {
                    this.currentLiquidity = 0
                }

                this.currentRight = this.curPP
                this.curPP = this.pos.get(this.curPP).left
                this.currentLeft = this.pos.get(this.curPP).left // using updated curPP

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
            this.priceToken1 = this.currentPrice
            this.priceToken0 = 1 / this.currentPrice

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

            journal[i].push(`Total sold ${this.totalSold}`)

            i += 1
        }

        if (globalConfig.JOURNAL && globalConfig.JOURNAL_SELL) {
            journal.forEach((iteration) => {
                console.log(iteration.join('\n'))
            })
        }

        if (!dry) {
            this.totalSold += totalAmountIn
            this.volumeToken1 += Math.abs(totalAmountIn)
            this.volumeToken0 += -totalAmountOut
            if (this.volumeToken0 < 0) {
                this.volumeToken0 = 0
            }
            if (this.totalSold < 0) {
                this.totalSold = 0
            }
        }

        return [totalAmountIn, totalAmountOut]
    }

    drySell(amount, priceLimit = null) {
        this.#dryState = {
            currentPrice: this.currentPrice,
            currentLiquidity: this.currentLiquidity,
            currentRight: this.currentRight,
            currentLeft: this.currentLeft,
            curPP: this.curPP,
            totalSold: this.totalSold,
            volumeToken0: this.volumeToken0,
            volumeToken1: this.volumeToken1
        }

        const [totalIn, totalOut] = this.sell(amount, priceLimit, true)

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
        return this.type
    }

    isQuest() {
        return this.type === 'QUEST'
    }

    getSwapInfo(logOut = false) {
        const leftBalance = this.dryBuy(100000000000)
        const rightBalance = this.drySell(100000000000)

        if (logOut) {
            console.log(`Pool: (cited/USDC)${this.name}(citing)
            buy(amt): ${this.tokenLeft} in (deduct from amt), ${
                this.tokenRight
            } out (add to balance)
            sell(amt): ${this.tokenRight} in (deduct from amt), ${
                this.tokenLeft
            } out (add to balance)
            --
            total ${this.tokenLeft}: ${
                rightBalance[1] > 0 ? rightBalance[1] : 0
            }
            total ${this.tokenRight}: ${leftBalance[1] > 0 ? leftBalance[1] : 0}
            ---
            can buy(take in) ${Math.abs(leftBalance[0])} ${
                this.tokenLeft
            } for(give out) ${Math.abs(leftBalance[1])} ${this.tokenRight}
            can sell(give) ${Math.abs(rightBalance[1])} ${
                this.tokenLeft
            } for(take) ${Math.abs(rightBalance[0])} ${this.tokenRight}`)
        }

        return [leftBalance, rightBalance]
    }

    getTVL() {
        return Math.round(this.totalSold * this.currentPrice)
    }

    getMarketCap() {
        const totalTokens = this.volumeToken0 + this.volumeToken1

        return Math.round(totalTokens * this.currentPrice)
    }

    getUSDCValue() {
        return this.isQuest() ? this.volumeToken0 : 0
    }
}
