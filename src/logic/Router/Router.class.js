import HashMap from 'hashmap'

import { getPathActions, isNearZero, isZero } from '../Utils/logicUtils'
import { Graph } from './Graph.class'
import { getMaxOneShotBuy, getMaxOneShotSell, maxSameLiqBuyIn } from './math'

export default class Router {
    _cachedPools = new HashMap()
    _cachedQuests = new HashMap()
    _shouldScanPaths = true

    _PRICED_PATHS = []
    _SWAPS = []
    _PAIR_PATHS = {}
    _DEFAULT_SWAP_SUM = 1
    _SWAP_SUM = 1

    /* eslint-disable no-loop-func */
    _DEBUG = false

    _visitedForGraph = []
    tempSwapReturns = 0

    /**
     *
     * @param {GlobalState.quests} stateQuests
     * @param {GlobalState.pools} statePools
     * @param {boolean} debug
     */
    constructor(stateQuests, statePools, debug = false) {
        this._cachedQuests = stateQuests
        this._cachedPools = statePools
        this._DEBUG = debug
    }

    /**
     * @param {string} token0
     * @param {string} token1
     * @param {number} amountIn
     * @returns {*[]|number[]}
     */
    smartSwap(token0, token1, amountIn, smartRouteDepth) {
        if (this._DEBUG) {
            console.log(
                `\n--- SMART ROUTE ${token0}/${token1}/${amountIn}---\n`
            )
        }

        this._SWAPS = []
        this._visitedForGraph = []
        this._PAIR_PATHS[`${token0}-${token1}`] = this.calculatePairPaths(
            token0,
            token1,
            smartRouteDepth
        )
        this.setSwapSum(amountIn)

        const totalInOut = [0, 0]

        do {
            this._PRICED_PATHS = this.drySwapForPricedPaths(
                this.getPairPaths(token0, token1)
            )

            if (this._DEBUG)
                console.log(
                    'priced paths',
                    this._PRICED_PATHS,
                    `amountIn: ${amountIn}`
                )

            if (!this._PRICED_PATHS.length) return totalInOut

            const priceLimit = this._PRICED_PATHS[1]
                ? this._PRICED_PATHS[1].price
                : null

            // @TODO: use getSwapAmtSameLiq to calculate amounts per pool
            const properAmountIn = this.getMaxAmountForPath(
                amountIn,
                this._PRICED_PATHS[0].path,
                priceLimit
            )
            console.log(
                '###DEBUG### Calculated maxAvailable amount: ',
                properAmountIn
            )
            const sums = this.swapPricedPath(
                amountIn,
                this._PRICED_PATHS[0].path,
                priceLimit
            )

            if (this._DEBUG) {
                console.log(
                    `[path-swap-result] ${sums}`,
                    `// token prices after swap:`,
                    `${token0}: ${
                        this.getPoolByTokens(token0, token1).priceToken0
                    } / ${token1}: ${
                        this.getPoolByTokens(token0, token1).priceToken1
                    }`
                )
            }

            amountIn -= sums[0]
            totalInOut[0] -= sums[0]
            totalInOut[1] += sums[1]
        } while (
            !isZero(amountIn) &&
            amountIn > 0 &&
            !isNearZero(amountIn) &&
            this._PRICED_PATHS.length
        )

        return totalInOut
    }

    setSwapSum(amountIn) {
        if (amountIn < this._DEFAULT_SWAP_SUM) {
            this._SWAP_SUM = amountIn
        } else {
            this._SWAP_SUM = this._DEFAULT_SWAP_SUM
        }
    }

    /**
     * @typedef {{ action: string, pool: Pool}} Step
     */
    /**
     * @description
     * @param {number} amountIn
     * @param {Step[]} path
     * @param {number} priceLimit
     * @returns {[ number, number]}
     */
    getMaxAmountForPath(amountIn, path, priceLimit) {
        let properAmountIn = amountIn
        const pathActions = getPathActions(path, this)
        let poolsMaxAmounts1 = []
        let poolsMaxAmounts2 = []

        for (const step of pathActions) {
            const zeroForOne = step.action === 'buy'

            //option 2 calculated via formulas
            const [totalIn, totalOut] = zeroForOne
                ? getMaxOneShotBuy(
                      step.pool.curLiq,
                      step.pool.curPrice,
                      step.pool.curRight
                  )
                : getMaxOneShotSell(
                      step.pool.curLiq,
                      step.pool.curPrice,
                      step.pool.curLeft
                  )
            const sums2 = [totalIn, totalOut]
            // option 1 drySwap path with huge amount
            const maxAmount = 1e9
            const sums1 = step.pool.drySwap(maxAmount, zeroForOne)

            poolsMaxAmounts1.push(sums1) // can delete this if formulas option is enough
            poolsMaxAmounts2.push(sums2)
            // TODO: should be tested more, both array are totally equal now
        }

        // calculate max iterating from the end of array poolsMaxAmounts
        return this.getMinAcceptableOfPoolCaps(poolsMaxAmounts2, pathActions)
    }

    getMinAcceptableOfPoolCaps(poolCaps, pathActions) {
        if (!poolCaps || !Array.isArray(poolCaps)) return 0

        let nextAmount = poolCaps[0][pathActions[0].action === 'buy' ? 0 : 1]
        poolCaps.forEach(([inSum, outSum], idx) => {
            const zeroForOne = pathActions[idx].action === 'buy'
            const { curLiq, curPrice } = pathActions[idx].pool

            const canReceiveAmount = maxSameLiqBuyIn(
                curLiq,
                curPrice,
                nextAmount
            )

            // @FIXME: it can be mistake here (need tests also)
            nextAmount = zeroForOne ? inSum : -outSum
            if (canReceiveAmount < nextAmount) {
                nextAmount = canReceiveAmount
            }
        })

        return nextAmount
    }

    // @TODO: cache global swaps somewhere where it's applicable (to avoid caching bad swaps)
    swapPricedPath(amountIn, path, priceLimit) {
        const swaps = this.swapPath(amountIn, path)
        const leftoverAmt = amountIn - swaps[0].in

        // Pool state preserved
        if (swaps.length === 1 && (swaps[0].in === 0 || swaps[0].out === 0)) {
            return [0, 0]
        }

        // in: 1000, [-1000, 150]
        if (isZero(leftoverAmt) || isNearZero(leftoverAmt)) {
            return [swaps[0].in, swaps[swaps.length - 1].out]
        }

        // check if outPrice of current path swap is higher than priceLimit
        // if true: return [totalIn/totalOut]
        // if false: call swapPath again with updated amountIn and repeat the process
        const outPrice = this.getOutInPrice(
            swaps[0].in,
            swaps[swaps.length - 1].out
        )

        if (outPrice < priceLimit || swaps.length === 1) {
            return [swaps[0].in, swaps[swaps.length - 1].out]
        } else {
            const nextAmount = amountIn - swaps[0].in
            console.log(
                `Recursing ${path} with ${nextAmount} limit ${priceLimit}`
            )
            return this.swapPricedPath(nextAmount, path, priceLimit)
        }
    }

    /**
     * @description Swap once within a given path with total amountIn
     * @param {number} amountIn
     * @param {string[]} path
     * @returns swaps array throughout the path
     */
    swapPath(amountIn, path) {
        const pathActions = getPathActions(path, this)

        let pathSwaps = []

        for (const [id, pact] of pathActions.entries()) {
            const { action, pool } = pact
            const zeroForOne = action === 'buy'

            // Ideal case:
            // USDC-AGORA-B-C
            // in: 1000
            // USDC-AGORA dryBuy(1000) -> 500 AGORA
            // AGORA-B dryBuy(500) -> 200 B
            // B-C dryBuy(200) -> 100 C
            // [-1000, 100]

            // Inconsistent case:
            // USDC-AGORA-B-C
            // in: 1000
            // USDC-AGORA dryBuy(1000) -> 500 AGORA -> maxSameLiqBuyIn(150AGORA)??? [-555USDC,150AGORA]
            // AGORA-B dryBuy(500) -> exactOut [-300, 200 B] // surplus 200 AGORA -> maxSameLiqBuyIn(100B)??? [-150AGORA,100B]
            // B-C dryBuy(200) -> [-100, 100 C] // surplus 100 B
            // [-1000, 100] -> [-555, 100]
            const poolSums = pool[action](amountIn)

            pathSwaps.push({
                path: path,
                pool: pool.name,
                op: zeroForOne ? 'BOUGHT' : 'SOLD',
                in: Math.abs(poolSums[0]),
                out: Math.abs(poolSums[1])
            })

            if (poolSums[0] === 0 || poolSums[1] === 0) {
                break
            }
        }

        return pathSwaps
    }

    // Due to inconsistent amounts swapped between pools,
    // we have to calculate leftovers and return them to USDC pool by investor via direct sell
    // Also due to insufficient amount in some pools like cross pools, we have to revert swaps that are empty half-way through
    // Otherwise tokens leak - as intermediate leftovers are not regarded and get lost
    // @TODO: Implement math formula for exactIn exactOut calculation instead of those reverse/return operations
    /**
     * @deprecated
     */
    swapBestPath(amount, pricedPath) {
        let localSwaps = []
        let shouldExitEmpty = false
        let nextPricedPath = this._PRICED_PATHS[1]
            ? this._PRICED_PATHS[1]
            : null
        let allSums = { in: 0, out: 0 }
        let lastOutPrice = 0

        const pathActions = getPathActions(pricedPath.path, this)

        let whileCounter = 0
        do {
            let pathSums = []
            let poolsSaved = []

            for (const [id, pact] of pathActions.entries()) {
                const sum = pathSums.length
                    ? pathSums[id - 1][1]
                    : amount < this._SWAP_SUM
                    ? amount
                    : this._SWAP_SUM

                const { action, pool } = pact
                const zeroForOne = action === 'buy'

                const poolSum = pool[action](sum)

                localSwaps.push({
                    path: pricedPath.path,
                    pool: pool.name,
                    op: zeroForOne ? 'BOUGHT' : 'SOLD',
                    in: Math.abs(poolSum[0]),
                    out: Math.abs(poolSum[1]),
                    id,
                    whileCounter
                })

                if (
                    poolSum[0] === 0 ||
                    poolSum[1] === 0 ||
                    isZero(poolSum[1] || isNearZero(poolSum[1]))
                ) {
                    this.revertPathSwaps(localSwaps)
                    localSwaps = []
                    shouldExitEmpty = true
                    break
                }

                let diff = sum - Math.abs(poolSum[0])
                if (
                    !isNearZero(diff) &&
                    !isZero(diff) &&
                    ((zeroForOne && !isNearZero(pool.volumeToken1)) ||
                        (!zeroForOne && !isNearZero(pool.volumeToken0)))
                ) {
                    console.log('diff', diff)
                    this.returnSurplus(pool, zeroForOne, diff)
                }

                if (this._DEBUG) {
                    const tokenFor = !zeroForOne
                        ? pool.tokenLeft
                        : pool.tokenRight
                    const tokenIn = !zeroForOne
                        ? pool.tokenRight
                        : pool.tokenLeft
                    console.log(
                        `[in-path-swap] ${pool.name}`,
                        `// ${action} for ${sum} ${
                            zeroForOne ? pool.tokenLeft : pool.tokenRight
                        }`,
                        `// spent ${poolSum[0]} ${tokenIn} for ${poolSum[1]} ${tokenFor}`,
                        `// ${pool.name} price ${pool.curPrice}`
                    )
                }

                pathSums.push(poolSum)
            }

            if (shouldExitEmpty) {
                break
            }

            const inAmt = pathSums[0][0]
            const outAmt = pathSums[pathSums.length - 1][1]

            // USDC-AGORA-B: 200USDC, 150B
            // USDC-AGORA buy for 200, get (100 AGORA)
            // AGORA-B buy for (100) get 150B
            lastOutPrice = this.getOutInPrice(inAmt, outAmt)

            if (this._DEBUG) {
                console.log('[swap-price-result]', lastOutPrice)
            }

            allSums.in += inAmt
            allSums.out += outAmt
            amount += inAmt

            this._SWAPS.push(...localSwaps)
            localSwaps = []
            whileCounter++
        } while (
            (!isNaN(lastOutPrice) || lastOutPrice > 0) &&
            !isZero(amount) &&
            !isNearZero(amount) &&
            nextPricedPath &&
            lastOutPrice > nextPricedPath.price
        )

        return [allSums.in, allSums.out]
    }

    // @TODO: What if the problem is in USDC pool?
    returnSurplus(pool, zeroForOne, diff) {
        const token = zeroForOne ? pool.tokenLeft : pool.tokenRight
        const usdcPool = this._cachedPools
            .values()
            .find((cp) => cp.isQuest() && cp.tokenRight === token)
        const [_, tOut] = usdcPool.sell(diff)
        console.log(
            'single surplus return - this should revert the entire chain',
            token,
            zeroForOne,
            usdcPool.name,
            `sums: ${_}/${tOut}`,
            diff
        )

        this.tempSwapReturns += tOut
    }

    /**
     * @description Takes all "so far executed" swaps in a path, pops the last one which triggered the reversion and trades back directly into pools to revert
     * @param {Object[]} swaps
     * @returns null
     */
    revertPathSwaps(swaps) {
        swaps.pop()
        const reverse = swaps.reverse()

        reverse.forEach((swap) => {
            const pool = this._cachedPools.get(swap.pool)
            const op = swap.op === 'SOLD' ? 'buy' : 'sell'
            pool[op](swap.out)
        })
    }

    /**
     * Takes array of string arrays (paths) and dry swaps each one of them to get their out/in price and sorts by best to worst price
     * @param {string[][]} paths
     * @returns Array of objects like {path: string[], price: number}
     */
    drySwapForPricedPaths(paths) {
        let pathPrices = []
        let existingPrices = []
        for (const path of paths) {
            const sumsTotal = this.drySwapPath(path)

            if (!sumsTotal) {
                continue
            }

            const sums = [sumsTotal[0][0], sumsTotal[sumsTotal.length - 1][1]]

            if (sums[0] === 0 || sums[1] === 0) {
                continue
            }

            const outPrice = this.getOutInPrice(sums[0], sums[1])

            pathPrices.push({
                path,
                price: outPrice
            })

            existingPrices.push(outPrice)
        }

        pathPrices.sort((a, b) => b.price - a.price)
        return pathPrices
    }

    /**
     * @description Takes array path and swaps through the entire path and returns prices along the way
     * @param {string[]} path
     * @param {number} [amount]
     * @returns {[number, number][]} array of pairs
     */
    drySwapPath(path, amount = 1) {
        let sumsTotal = []
        let nextAmountIn = amount

        const pathActions = getPathActions(path, this)

        for (const pact of pathActions) {
            const { action, pool } = pact
            const zeroForOne = action === 'buy'

            const hasNextToken = zeroForOne
                ? !isZero(pool.volumeToken1) && !isNearZero(pool.volumeToken1)
                : !isZero(pool.volumeToken0) && !isNearZero(pool.volumeToken0)

            if (!hasNextToken) {
                return null
            }

            const sums = pool.drySwap(nextAmountIn, zeroForOne)

            if (Math.abs(sums[0]) === 0 && Math.abs(sums[1]) === 0) {
                return null
            }

            nextAmountIn = Math.abs(sums[1])
            sumsTotal.push(sums)
        }

        return sumsTotal
    }

    /**
     * @description For a requested token pair returns calculated pathways that should be then weighted for best price
     * @param {string} token0
     * @param {string} token1
     * @param {number} smartRouteDepth
     * @returns Array of possible paths
     */
    calculatePairPaths(token0, token1, smartRouteDepth) {
        const poolList = this.findPoolsFor(token0, smartRouteDepth)
        if (this._DEBUG) console.log('pool list', poolList)
        if (this._DEBUG && poolList.length <= 0) console.log(this._cachedQuests)
        const graph = this.graphPools(poolList, smartRouteDepth)
        if (this._DEBUG) console.log('graph', graph)
        const paths = graph.buildPathways(token0, token1)
        if (this._DEBUG) console.log('pair paths', paths)

        return paths
    }

    /**
     * @description Finds all pools for a specific token under restricted depth
     * @param {string} tokenName
     * @param {number} maxDepth
     * @param {number} depth
     * @returns {[]|*[]}
     */
    findPoolsFor(tokenName, maxDepth, depth = 1) {
        let results = this._processTokenForPath(tokenName)

        if (depth >= maxDepth && this._shouldScanPaths) {
            this._shouldScanPaths = false
            return results
        }

        results.forEach((res) => {
            const leftPools = this.findPoolsFor(
                res.tokenLeft,
                maxDepth,
                depth + 1
            )
            const rightPools = this.findPoolsFor(
                res.tokenRight,
                maxDepth,
                depth + 1
            )

            results = Array.prototype.concat(results, leftPools, rightPools)
        })

        return results
    }

    /**
     * @description Creates cyclic undirected graph of all connected pools
     * @param {Pool[]} poolList
     * @param {number} smartRouteDepth
     * @returns Graph instance
     */
    graphPools(poolList, smartRouteDepth) {
        const graph = new Graph(smartRouteDepth)
        poolList.forEach((pool) => {
            if (!graph.adjList.has(pool.tokenLeft)) {
                graph.addVertex(pool.tokenLeft)
            }

            if (!graph.adjList.has(pool.tokenRight)) {
                graph.addVertex(pool.tokenRight)
            }
        })

        poolList.forEach((pool) => {
            graph.addEdge(pool.tokenLeft, pool.tokenRight)
        })

        return graph
    }

    _processTokenForPath(tokenName) {
        let quest = this._cachedQuests.get(tokenName)

        if (!quest) {
            return []
        }

        let candidatePools = quest.pools

        if (!candidatePools || candidatePools.length <= 0) {
            return []
        }

        const result = []
        candidatePools.forEach((pool) => {
            const foundPool = this._cachedPools.get(pool)
            if (!foundPool || this._visitedForGraph.includes(foundPool.name)) {
                return
            }

            this._visitedForGraph.push(foundPool.name)

            result.push({
                for: tokenName,
                tokenLeft: foundPool.tokenLeft,
                tokenRight: foundPool.tokenRight
            })
        })

        return result
    }

    getPairPaths(token0, token1) {
        return this._PAIR_PATHS[`${token0}-${token1}`]
    }

    // 1:2 = 2
    // 1:1.5 = 1.5
    getOutInPrice(inAmt, outAmt) {
        return Math.abs(outAmt) / Math.abs(inAmt)
    }

    getSwaps() {
        return this._SWAPS
    }

    getPoolByTokens(tokenA, tokenB) {
        return this._cachedPools.has(`${tokenA}-${tokenB}`)
            ? this._cachedPools.get(`${tokenA}-${tokenB}`)
            : this._cachedPools.get(`${tokenB}-${tokenA}`)
    }
}
