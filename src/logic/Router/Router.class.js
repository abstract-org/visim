import HashMap from 'hashmap'

import { getPathActions, isNearZero, isZero } from '../Utils/logicUtils'
import { Graph } from './Graph.class'
import {
    buySameLiqGiveT0GetT1,
    buySameLiqGiveT1GetT0,
    getSwapAmtSameLiq,
    sellSameLiqGiveT0GetT1,
    sellSameLiqGiveT1GetT0
} from './math'

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
        let properAmountIn
        let counterWhileLoop = 0
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
            properAmountIn = this.getMaxAmountInForPath(
                amountIn,
                this._PRICED_PATHS[0].path
            )
            console.log(`###DEBUG Calculated properAmountIn: ${properAmountIn}`)
            if (
                isZero(properAmountIn) ||
                isNearZero(properAmountIn) ||
                properAmountIn <= 0
            ) {
                break
            }
            const sums = this.swapPricedPath(
                properAmountIn,
                this._PRICED_PATHS[0].path,
                priceLimit
            )

            // console.log(
            //     `[path-swap-result] ${sums}`,
            //     `// token prices after swap:`,
            //     `${token0}: ${
            //         this.getPoolByTokens(token0, token1).priceToken0
            //     } / ${token1}: ${
            //         this.getPoolByTokens(token0, token1).priceToken1
            //     }`
            // )

            amountIn -= sums[0]
            totalInOut[0] -= sums[0]
            totalInOut[1] += sums[1]
            console.log('while-loop iteration ', counterWhileLoop++, 'ended')
        } while (
            !isZero(amountIn) &&
            amountIn > 0 &&
            !isNearZero(amountIn) &&
            this._PRICED_PATHS.length &&
            !isZero(properAmountIn) &&
            properAmountIn > 0 &&
            !isNearZero(properAmountIn)
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
     * @description Calculates max amount could be thrown into swaps chain to have tokens without surplus
     * @param {number} amountIn
     * @param {string[]} path
     * @param {number} priceLimit
     * @returns {number} max acceptable amount in for the path
     */
    getMaxAmountInForPath(amountIn, path) {
        // @FIXME: remove or use priceLimit parameter if needed
        const pathActions = getPathActions(path, this)
        if (!pathActions.length) return 0

        const pathWithActionsCaps = this.getPathWithActionCaps(pathActions)
        if (!pathWithActionsCaps) return 0

        const maxAcceptable =
            this.calculateAcceptableForCappedPathActions(pathWithActionsCaps)

        return maxAcceptable > amountIn ? amountIn : maxAcceptable
    }

    /**
     * @typedef {Object} PathAction
     * @property {string} action
     * @property {Pool} pool
     */
    /**
     * @description Fills in pathActions with max in/outs for each pool in path
     * @param {PathAction[]} pathActions
     * @param {boolean} shouldUseDrySwap - set true if formulas broken
     * @returns {StepWithCaps[]}
     */
    getPathWithActionCaps(pathActions) {
        const pathActionsWithCaps = []

        for (const step of pathActions) {
            const zeroForOne = step.action === 'buy'

            const cappedAmountsSameLiq = getSwapAmtSameLiq(
                step.pool,
                zeroForOne
            )
            if (
                cappedAmountsSameLiq.t0fort1 === 0 ||
                cappedAmountsSameLiq.t1fort0 === 0
            ) {
                console.log(
                    step.pool.name,
                    ' ',
                    step.action,
                    ' ### WARNING! getSwapAmtSameLiq returned  msg:',
                    cappedAmountsSameLiq.msg,
                    ' t0fort1=',
                    cappedAmountsSameLiq.t0fort1,
                    ' t1fort0=',
                    cappedAmountsSameLiq.t1fort0,
                    ' pathActions:',
                    pathActions
                )

                return null
            }
            pathActionsWithCaps.push({
                ...step,
                ...cappedAmountsSameLiq
            })
        }

        console.log('pathActionsWithCaps()', pathActionsWithCaps)

        return pathActionsWithCaps
    }

    /**
     * @typedef {Object} PathActionCaps
     * @property {number} t0fort1
     * @property {number} t1fort0
     */
    /**
     * @typedef {PathAction & PathActionCaps} StepWithCaps
     */
    /**
     * @description Iterates path from the end verifying each step throughput
     * @param {StepWithCaps[]} pathWithActionCaps
     * @param {boolean} shouldDrySwap
     * @returns {number|*|number}
     */
    calculateAcceptableForCappedPathActions(pathWithActionCaps) {
        if (!Array.isArray(pathWithActionCaps) || !pathWithActionCaps.length) {
            return 0
        }

        const reversedPath = [...pathWithActionCaps].reverse()
        let carryOver = 0
        let newAmount = 0

        reversedPath.forEach((step, idx) => {
            const zeroForOne = step.action === 'buy'
            const activeCurLiq = step.pool.getNearestActiveLiq(zeroForOne)
            if (!Array.isArray(activeCurLiq) || activeCurLiq.length < 1) {
                console.log(step)
            }
            const curFormulaArgs = [activeCurLiq[0], activeCurLiq[1]]
            if (idx === 0) {
                step.pool.getNearestActiveLiq(zeroForOne)
                newAmount = zeroForOne
                    ? buySameLiqGiveT1GetT0(...curFormulaArgs, step.t1fort0)
                    : sellSameLiqGiveT0GetT1(...curFormulaArgs, step.t0fort1)
                carryOver = newAmount
                return
            }

            const prev = reversedPath[idx - 1]
            const prevZeroForOne = prev.action === 'buy'
            const activePrevLiq = prev.pool.getNearestActiveLiq(prevZeroForOne)
            const prevFormulaArgs = [activePrevLiq[0], activePrevLiq[1]]

            if (idx === reversedPath.length - 1) {
                newAmount = zeroForOne
                    ? buySameLiqGiveT1GetT0(...curFormulaArgs, carryOver)
                    : sellSameLiqGiveT0GetT1(...curFormulaArgs, carryOver)
            } else {
                let prevT = prevZeroForOne
                    ? buySameLiqGiveT1GetT0(...prevFormulaArgs, prev.t1fort0)
                    : sellSameLiqGiveT0GetT1(...prevFormulaArgs, prev.t0fort1)

                let curT = zeroForOne
                    ? buySameLiqGiveT0GetT1(...curFormulaArgs, step.t0fort1)
                    : sellSameLiqGiveT1GetT0(...curFormulaArgs, step.t1fort0)

                if (prevT < curT) {
                    curT = prevT
                }

                let newT = zeroForOne
                    ? buySameLiqGiveT1GetT0(...curFormulaArgs, step.t1fort0)
                    : sellSameLiqGiveT0GetT1(...curFormulaArgs, step.t0fort1)

                carryOver = newT
            }

            // @TODO: Which one should we use in sell?
            // first takes 75C and returns 106B
            // console.log(
            //     step.t0fort1,
            //     sellSameLiqGiveT0GetT1(activeLiq[0], activeLiq[1], step.t0fort1)
            // )
            // // second takes 106B and returns 75C
            // console.log(
            //     step.t1fort0,
            //     sellSameLiqGiveT1GetT0(activeLiq[0], activeLiq[1], step.t1fort0)
            // )

            // console.log(
            //     'canSpendAmount()',
            //     `${zeroForOne ? 'buy' : 'sell'}`,
            //     canSpendAmount,
            //     nextAmountIn,
            //     [...formulaArgs]
            // )

            // // if buy and not last (exiting) operation
            // if (zeroForOne) {
            //     if (idx === !reversedPath.length - 1) {
            //         // take t1 from buy formula and calculate x t0
            //     }
            //     // take t0 from buy formula
            // } else {
            //     // take t0 from sell formula
            // }

            // // if 311(t0) is more than we can get now 75C(t1), then take what would it take to get 75C (106B)
            // // if 106B(t1) is less than we want to get 150B(t0), take what it would take to get 106B (xA)
            // if (canSpendAmount < nextAmountIn) {
            //     nextAmountIn = canSpendAmount
            // } else if (canSpendAmount === 0) {
            //     return
            // }
        })

        return newAmount
    }

    // @TODO: cache global swaps somewhere where it's applicable (to avoid caching bad swaps)
    swapPricedPath(amountIn, path, priceLimit) {
        const swaps = this.swapPath(amountIn, path)
        console.log('swapPricedPath() swaps to be', swaps)
        const leftoverAmt = amountIn - swaps[0].in

        // Pool state preserved
        if (swaps.length === 1 && (swaps[0].in === 0 || swaps[0].out === 0)) {
            return [0, 0]
        }
        console.log('...swaps saved')
        this._SWAPS = [...this._SWAPS, ...swaps]
        // in: 1000, [-1000, 150]
        if (isZero(leftoverAmt) || isNearZero(leftoverAmt)) {
            return [swaps[0].in, swaps[swaps.length - 1].out]
        }

        // TODO: consider to change conditions and return from here
        // check if outPrice of current path swap is higher than priceLimit
        // if true: return [totalIn/totalOut]
        // if false: call swapPath again with updated amountIn and repeat the process
        const outPrice = this.getOutInPrice(
            swaps[0].in,
            swaps[swaps.length - 1].out
        )

        return [swaps[0].in, swaps[swaps.length - 1].out]
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
        let amountSwap = amountIn

        for (const [id, pact] of pathActions.entries()) {
            const { action, pool } = pact
            const zeroForOne = action === 'buy'
            const poolSums = pool[action](amountSwap)

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

            amountSwap = poolSums[1]
        }

        return pathSwaps
    }

    /* @deprecated */
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
