import HashMap from 'hashmap'

import { isZero } from '../Utils/logicUtils'
import { Graph } from './Graph.class'

export default class Router {
    #cachedPools = new HashMap()
    #cachedQuests = new HashMap()
    #shouldScanPaths = true

    #_PRICED_PATHS = []
    #_VISITED_PATHS = []
    #_SWAPS = []
    #_PAIR_PATHS = {}
    #_DEFAULT_SWAP_SUM = 10
    #_SWAP_SUM_MAX_CHUNKS = 100
    #_SWAP_SUM_STEPPER = 10000

    /* eslint-disable no-loop-func */
    #DEBUG = false
    #DEBUG_DRY = false

    #_visitedForGraph = []
    tempSwapReturns = 0

    // @param State state
    constructor(stateQuests, statePools, debug = false, debugDry = false) {
        this.#cachedQuests = stateQuests
        this.#cachedPools = statePools
        this.#DEBUG = debug
        this.#DEBUG_DRY = debugDry
    }

    /**
     * @param {string} token0
     * @param {string} token1
     * @param {number} amountIn
     * @returns {*[]|number[]}
     */
    smartSwap(token0, token1, amountIn, smartRouteDepth, debug) {
        if (debug) this.#DEBUG = true

        if (this.#DEBUG)
            console.log(
                `\n--- SMART ROUTE ${token0}/${token1}/${amountIn}---\n`
            )
        this.#_SWAPS = []
        this.#_VISITED_PATHS = []
        this.#_visitedForGraph = []
        this.tempSwapReturns = 0

        const totalInOut = [0, 0, 0]

        this.calculatePairPaths(token0, token1, smartRouteDepth)

        if (amountIn > this.#_SWAP_SUM_STEPPER) {
            this.#_DEFAULT_SWAP_SUM = amountIn / this.#_SWAP_SUM_MAX_CHUNKS
        } else {
            this.#_DEFAULT_SWAP_SUM = this.#_SWAP_SUM_MAX_CHUNKS
        }

        do {
            this.#_PRICED_PATHS = this.drySwapForPricedPaths(
                this.getPairPaths(token0, token1)
            )

            if (this.#DEBUG)
                console.log(
                    'priced paths',
                    this.#_PRICED_PATHS,
                    `amountIn: ${amountIn}`
                )

            if (!this.#_PRICED_PATHS.length) return totalInOut

            const sums = this.swapBestPath(amountIn, this.#_PRICED_PATHS[0])

            if (this.#DEBUG) {
                console.log(
                    `[path-swap-result] ${sums}`,
                    `prices`,
                    `${this.#getPoolByTokens(token0, token1).priceToken0} / ${
                        this.#getPoolByTokens(token0, token1).priceToken1
                    }`
                )
            }

            amountIn += sums[0]
            totalInOut[0] += sums[0]
            totalInOut[1] += sums[1]
            totalInOut[2] += this.tempSwapReturns
            this.tempSwapReturns = 0

            if (!this.#_VISITED_PATHS.includes(this.#_PRICED_PATHS[0])) {
                this.#_VISITED_PATHS.push(this.#_PRICED_PATHS[0])
            }
        } while (
            !isZero(amountIn) &&
            amountIn > 0 &&
            !this.#isNearZero(amountIn) &&
            this.#_PRICED_PATHS.length
        )

        if (debug) this.#DEBUG = false
        return totalInOut
    }

    swapBestPath(amount, pricedPath) {
        if (!pricedPath) return

        let localSwaps = []
        // Due to inconsistent amounts swapped between pools, we have to calculate leftovers and return them to USDC pool by investor via direct sell
        // Otherwise tokens leak - as intermediate leftovers are not regarded and get lost
        // @TODO: Implement math formula for exactIn exactOut
        let shouldExitEmpty = false

        const poolPairs = pricedPath.path
            .map((token, id) => [token, pricedPath.path[id + 1]])
            .filter((pair) => pair[0] && pair[1])

        const pools = poolPairs.map((poolPair) =>
            this.#getPoolByTokens(poolPair[0], poolPair[1])
        )

        let nextPricedPath = this.#_PRICED_PATHS[1]
            ? this.#_PRICED_PATHS[1]
            : null

        let allSums = { in: 0, out: 0 }
        let lastOutPrice = 0
        do {
            // @TODO: This mess is probably not working well :<
            let pathSums = []
            for (const [id, pool] of pools.entries()) {
                const zeroForOne =
                    pool.tokenLeft === poolPairs[id][0] ? true : false
                const sum = pathSums.length
                    ? pathSums[id - 1][1]
                    : amount < this.#_DEFAULT_SWAP_SUM
                    ? amount
                    : !pool.isQuest()
                    ? 10
                    : this.#_DEFAULT_SWAP_SUM
                const action = zeroForOne ? 'buy' : 'sell'
                const poolSum = pool[action](sum)

                if (sum !== poolSum[0]) {
                    let diff = sum - Math.abs(poolSum[0])
                    if (this.#isNearZero(diff) || isZero(diff)) {
                        diff = 0
                    }

                    if (diff > 0) {
                        const token = zeroForOne
                            ? pool.tokenLeft
                            : pool.tokenRight
                        const usdcPool = this.#cachedPools
                            .values()
                            .find(
                                (cp) => cp.isQuest() && cp.tokenRight === token
                            )
                        const [_, tOut] = usdcPool.sell(diff)

                        this.tempSwapReturns += tOut
                        this.#cachedPools.set(usdcPool.name, usdcPool)
                    }
                }

                localSwaps.push({
                    path: pricedPath.path,
                    pool: pool.name,
                    op: zeroForOne ? 'BOUGHT' : 'SOLD',
                    in: Math.abs(poolSum[0]),
                    out: Math.abs(poolSum[1])
                })

                if (this.#DEBUG) {
                    console.log(
                        '[actual-swap]',
                        pool.name,
                        action,
                        sum,
                        poolSum,
                        pool.curPrice
                    )
                }

                if (poolSum[0] === 0 || poolSum[1] === 0) {
                    this.revertPathSwaps(pathSums, localSwaps)
                    localSwaps = []
                    allSums = { in: 0, out: 0 }
                    shouldExitEmpty = true
                    break
                }

                pathSums.push(poolSum)
            }

            if (shouldExitEmpty) {
                break
            }

            const inAmt = pathSums[0][0]
            const outAmt = pathSums[pathSums.length - 1][1]

            if (this.#DEBUG) {
                console.log(
                    '[swap-pre-result]',
                    inAmt,
                    outAmt,
                    'vs calculated',
                    pathSums[0][0],
                    pathSums[pathSums.length - 1][1]
                )
            }

            lastOutPrice = this.#getOutInPrice(inAmt, outAmt)

            allSums.in += inAmt
            allSums.out += outAmt
            amount += inAmt
        } while (
            (!isNaN(lastOutPrice) || lastOutPrice > 0) &&
            !isZero(amount) &&
            nextPricedPath &&
            lastOutPrice >= nextPricedPath.price
        )

        localSwaps.forEach((swap) => {
            this.#_SWAPS.push(swap)
        })

        return [allSums.in, allSums.out]
    }

    // Should be moved to direct swap in the pools for exact amount back
    revertPathSwaps(poolSum, swaps) {
        // Nothing to revert
        if (!poolSum.length) {
            return
        }

        // remove last bad trade
        swaps.pop()
        const reverse = swaps.reverse()

        let lastOut = reverse[0].out

        reverse.forEach((swap) => {
            const pool = this.#cachedPools.get(swap.pool)
            const op = swap.op === 'SOLD' ? 'buy' : 'sell'

            const [_, totalOut] = pool[op](lastOut)

            lastOut = totalOut
        })
    }

    /**
     *
     * @param {string[]} paths Array of all possible paths in graph from A to B
     * @returns {object[{path: string, price: integer}]} Array with objects containing priced and sorted paths from best to worst
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

            const outPrice = this.#getOutInPrice(sums[0], sums[1])

            pathPrices.push({
                path,
                price: outPrice
            })

            // console.log(
            //     `Pushing path ${path} price ${outPrice} cuz sums ${sums[0]} / ${sums[1]}`,
            //     sumsTotal
            // )

            existingPrices.push(outPrice)
        }

        pathPrices.sort((a, b) => b.price - a.price)
        return pathPrices
    }

    calculatePairPaths(token0, token1, smartRouteDepth) {
        const poolList = this.findPoolsFor(token0, smartRouteDepth)
        if (this.#DEBUG) console.log('pool list', poolList)
        if (this.#DEBUG && poolList.length <= 0) console.log(this.#cachedQuests)
        const graph = this.graphPools(poolList, smartRouteDepth)
        if (this.#DEBUG) console.log('graph', graph)
        const paths = graph.buildPathways(token0, token1)
        this.#_PAIR_PATHS[`${token0}-${token1}`] = paths
        if (this.#DEBUG) console.log('pair paths', this.#_PAIR_PATHS)

        return paths
    }

    getPairPaths(token0, token1) {
        return this.#_PAIR_PATHS[`${token0}-${token1}`]
    }

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

    /**
     * @param {string} tokenName
     * @param {number} depth
     * @returns {[]|*[]}
     */
    findPoolsFor(tokenName, maxDepth, depth = 1) {
        let results = this.#processTokenForPath(tokenName)

        if (depth >= maxDepth && this.#shouldScanPaths) {
            this.#shouldScanPaths = false
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

    sortByBestPrice(swaps) {
        let sortedPrices = []
        let pricedPaths = {}
        swaps.forEach((swapPath) => {
            const amtIn = swapPath[0].in
            const amtOut = swapPath[swapPath.length - 1].out
            const price = this.#getOutInPrice(amtIn, amtOut)

            if (amtIn > 0 && amtOut > 0) {
                sortedPrices.push(price)
                pricedPaths[swapPath[0].path] = price
            }
        })

        sortedPrices.sort((a, b) => a - b)

        return [sortedPrices, pricedPaths]
    }

    /**
     * @description Takes token0/token1 as direction and a path as a string and swaps through the entire path and returns very first and very last prices
     * @param {string} token0
     * @param {string} token1
     * @param {array} path
     * @returns {number, number}
     */
    drySwapPath(path) {
        const amount = 1
        const poolPairs = path
            .map((token, id) => [token, path[id + 1]])
            .filter((pair) => pair[0] && pair[1])

        let sumsTotal = []
        let amountIn = amount

        for (const id in poolPairs) {
            let idx = parseInt(id)
            const poolTokens = poolPairs[idx]
            const pool = this.#getPoolByTokens(poolTokens[0], poolTokens[1])
            const zeroForOne = pool.tokenLeft === poolTokens[0] ? true : false

            const hasNextToken = zeroForOne
                ? !isZero(pool.volumeToken1) &&
                  !this.#isNearZero(pool.volumeToken1)
                : !isZero(pool.volumeToken0) &&
                  !this.#isNearZero(pool.volumeToken0)

            if (!hasNextToken) {
                return null
            }

            const sums = pool.drySwap(amountIn, zeroForOne)

            if (Math.abs(sums[0]) === 0 || Math.abs(sums[1]) === 0) {
                return null
            }

            amountIn = Math.abs(sums[1])

            sums[2] = zeroForOne
            sums[3] = pool.name
            sums[4] = poolTokens
            sumsTotal.push(sums)
        }

        return sumsTotal
        //return [sumsTotal[0][0], sumsTotal[sumsTotal.length - 1][1]]
    }

    getPaths() {
        return this.#_VISITED_PATHS
    }

    getSwaps() {
        return this.#_SWAPS
    }

    #processTokenForPath(tokenName) {
        let quest = this.#cachedQuests.get(tokenName)

        if (!quest) {
            return []
        }

        let candidatePools = quest.pools

        if (!candidatePools || candidatePools.length <= 0) {
            return []
        }

        const result = []
        candidatePools.forEach((pool) => {
            const foundPool = this.#cachedPools.get(pool)
            if (!foundPool || this.#_visitedForGraph.includes(foundPool.name)) {
                return
            }

            this.#_visitedForGraph.push(foundPool.name)

            result.push({
                for: tokenName,
                tokenLeft: foundPool.tokenLeft,
                tokenRight: foundPool.tokenRight
            })
        })

        return result
    }

    #getOutInPrice(inAmt, outAmt) {
        return Math.abs(outAmt) / Math.abs(inAmt)
    }

    #getPoolByTokens(tokenA, tokenB) {
        return this.#cachedPools.has(`${tokenA}-${tokenB}`)
            ? this.#cachedPools.get(`${tokenA}-${tokenB}`)
            : this.#cachedPools.get(`${tokenB}-${tokenA}`)
    }

    chunkAmountBy(amount, by) {
        const max = Math.floor(amount / by)
        const mod = amount % by

        const chunks = Array(max).fill(by)

        if (mod > 0) {
            chunks.push(mod)
        }

        return chunks
    }

    #isNearZero(amountIn) {
        return (
            0 ===
            parseInt(
                amountIn
                    .toFixed(10)
                    .replace(/\D/g, '')
                    .split('')
                    .slice(0, 8)
                    .join('')
            )
        )
    }
}
