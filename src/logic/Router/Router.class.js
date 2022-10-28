import HashMap from 'hashmap'

import { isZero, tokenIntersect } from '../Utils/logicUtils'
import { Graph } from './Graph.class'
import {
    getMaxOneShotBuy,
    getMaxOneShotSell,
    maxSameLiqBuyIn,
    maxSameLiqBuyOut,
    maxSameLiqSellIn,
    maxSameLiqSellOut
} from './math'

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

        const totalInOut = [0, 0]

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
            this.#_PRICED_PATHS = this.cleanUpPaths(this.#_PRICED_PATHS)

            if (this.#DEBUG)
                console.log(
                    'priced paths',
                    this.#_PRICED_PATHS,
                    `amountIn: ${amountIn}`
                )

            if (!this.#_PRICED_PATHS.length) return totalInOut

            //const sums = this.swapBestPath(amountIn, this.#_PRICED_PATHS[0])
            const sums = this.swapPricedPaths(amountIn, this.#_PRICED_PATHS)
            return

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

    swapPricedPaths(amountIn, paths) {
        paths.forEach((po) => {
            const path = po.path

            const maxIn = this.calculateMaxIn(path, amountIn)
        })

        return [0, 0]
    }

    swapBestPath(amount, pricedPath, dry = false) {
        if (!pricedPath) return

        let poolsCache = []

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
            let pathSums = []
            pools.forEach((pool, id) => {
                const zeroForOne =
                    pool.tokenLeft === poolPairs[id][0] ? true : false
                const sum = pathSums.length
                    ? pathSums[id - 1][1]
                    : amount < this.#_DEFAULT_SWAP_SUM
                    ? amount
                    : this.#_DEFAULT_SWAP_SUM
                const action = zeroForOne ? 'buy' : 'sell'

                let poolCache = JSON.parse(JSON.stringify(pool))
                const poolSum = pool[action](sum)
                poolsCache.push({
                    pool: poolCache,
                    action,
                    sum,
                    poolSum
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

                pathSums.push(poolSum)

                this.#_SWAPS.push({
                    path: pricedPath.path,
                    pool: pool.name,
                    op: zeroForOne ? 'BOUGHT' : 'SOLD',
                    in: Math.abs(poolSum[0]),
                    out: Math.abs(poolSum[1])
                })
            })
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

        return [allSums.in, allSums.out]
    }

    calculateMaxIn(path, amountIn) {
        console.log(path, amountIn)
        let sumsTotal = []
        let localAmountIn = amountIn
        let localAmountOut = 0
        let zeroForOne = true

        const poolPairs = path
            .map((token, id) => [token, path[id + 1]])
            .filter((pair) => pair[0] && pair[1])

        for (let [idx, pair] of poolPairs.entries()) {
            const prevPair = poolPairs[idx - 1] || null

            const pool = this.#getPoolByTokens(pair[0], pair[1])
            if (prevPair) {
                const intersect = tokenIntersect(prevPair, pair)
                if (intersect.length > 0) {
                    zeroForOne = pool.tokenRight === intersect[0] ? false : true
                }
            }
            const action = zeroForOne ? 'dryBuy' : 'drySell'

            const [totalIn, totalOut] = pool[action](localAmountIn)
            localAmountIn = totalOut
            console.log(
                'dry-swap',
                action,
                pool.name,
                totalIn,
                totalOut,
                localAmountIn
            )
        }

        return sumsTotal
    }

    cleanUpPaths(pricedPaths) {
        const localPaths = JSON.parse(JSON.stringify(pricedPaths))
        let existingQuests = []

        if (localPaths.length > 1) {
            localPaths.forEach((path, pathId) => {
                let elimPath = false
                let localQuests = []

                for (let [idx, quest] of path.path.entries()) {
                    if (quest === 'USDC') {
                        continue
                    }

                    if (existingQuests.includes(quest)) {
                        elimPath = true
                        localQuests = []
                        break
                    } else {
                        localQuests.push(quest)
                    }
                }

                existingQuests = Array.prototype.concat(
                    existingQuests,
                    localQuests
                )

                if (elimPath) {
                    delete localPaths[pathId]
                }
            })
        }

        return localPaths.filter((x) => x)
    }

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
     * @description Takes array path and swaps through the entire path and returns very first and very last prices
     * @param {array} path
     * @returns {number, number}
     */
    drySwapPath(path, amountIn) {
        let curAmount = amountIn || 1

        const poolPairs = path
            .map((token, id) => [token, path[id + 1]])
            .filter((pair) => pair[0] && pair[1])

        let sumsTotal = []

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

            const sums = pool.drySwap(curAmount, zeroForOne)

            if (Math.abs(sums[0]) === 0 && Math.abs(sums[1]) === 0) {
                return null
            }

            curAmount = parseFloat(Math.abs(sums[1]))

            sumsTotal.push(sums)
        }

        return sumsTotal
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
