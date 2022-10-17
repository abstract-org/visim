import HashMap from 'hashmap'

import { byName } from '../Utils/logicUtils'
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

            if (this.#DEBUG)
                console.log('priced paths', this.#_PRICED_PATHS, amountIn)

            if (!this.#_PRICED_PATHS.length) return totalInOut

            const sums = this.swapBestPath(amountIn, this.#_PRICED_PATHS[0])

            amountIn += sums[0]
            totalInOut[0] += sums[0]
            totalInOut[1] += sums[1]

            if (!this.#_VISITED_PATHS.includes(this.#_PRICED_PATHS[0])) {
                this.#_VISITED_PATHS.push(this.#_PRICED_PATHS[0])
            }
        } while (
            !this.isZero(amountIn) &&
            amountIn > 0 &&
            !this.#isNearZero(amountIn) &&
            this.#_PRICED_PATHS.length
        )

        if (debug) this.#DEBUG = false

        return totalInOut
    }

    calculatePairPaths(token0, token1, smartRouteDepth) {
        const poolList = this.findPoolsFor(token0, smartRouteDepth)
        if (this.#DEBUG) console.log('pool list', poolList)
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

    swapBestPath(amount, pricedPath) {
        if (!pricedPath) return

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
                const poolSum = pool[zeroForOne ? 'buy' : 'sell'](sum)

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

            lastOutPrice = this.#getOutInPrice(inAmt, outAmt)

            allSums.in += inAmt
            allSums.out += outAmt
            amount += inAmt
        } while (
            (!isNaN(lastOutPrice) || lastOutPrice > 0) &&
            !this.isZero(amount) &&
            nextPricedPath &&
            lastOutPrice >= nextPricedPath.price
        )

        return [allSums.in, allSums.out]
    }

    drySwapForPricedPaths(paths) {
        let pathPrices = []
        let existingPrices = []
        for (const path of paths) {
            const { sums } = this.swapInPath(path, 1, true)

            if (sums[1] === 0) {
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

    swapInPath(path, amount, dry = false) {
        const poolPairs = path
            .map((token, id) => [token, path[id + 1]])
            .filter((pair) => pair[0] && pair[1])
        const swaps = []
        let sums = []
        let sumsTotal = []

        for (const id in poolPairs) {
            let idx = parseInt(id)
            const poolTokens = poolPairs[idx]
            const pool = this.#getPoolByTokens(poolTokens[0], poolTokens[1])
            const nextPool =
                idx + 1 < poolPairs.length
                    ? this.#getPoolByTokens(
                          poolPairs[idx + 1][0],
                          poolPairs[idx + 1][1]
                      )
                    : null

            const zeroForOne = pool.tokenLeft === poolTokens[0] ? true : false

            sums = dry
                ? pool.drySwap(amount, zeroForOne)
                : pool.swap(amount, zeroForOne)

            if (idx === 0) {
                sumsTotal[0] = sums[0]
            }
            if (idx === poolPairs.length - 1) {
                sumsTotal[1] = sums[1]
            }

            if ((this.#DEBUG && !dry) || (this.#DEBUG_DRY && dry)) {
                console.log(
                    `[${dry ? 'DRY' : 'REAL'}]\n`,
                    `ID: ${idx}\n`,
                    `POOL: ${pool.name}\n`,
                    `PATH: ${path}\n`,
                    `PAIRS: ${poolPairs}\n`,
                    `${zeroForOne ? 'BUY' : 'SELL'}\n`,
                    `AMT PRE CAP: ${amount}\n`,
                    `SUMS: ${sums}\n`,
                    `RESULT: ${sumsTotal}`
                )
            }
            amount = Math.abs(sums[1])

            if (Math.abs(sums[0]) === 0 && Math.abs(sums[1]) === 0) {
                if ((this.#DEBUG && !dry) || this.#DEBUG_DRY)
                    console.log(
                        `[${
                            dry ? 'DRY' : 'REAL'
                        }] Swap returned nils at ${path} on index ${idx} pool ${
                            pool.name
                        }`,
                        pool.drySell(1.1726),
                        pool.getSwapInfo(true)
                    )
                return { swaps, sums: [0, 0] }
            }

            // @TODO: Currently cases where chain swap can break is filtered out during drySwap
            // Can be smarter solution?
            if (amount <= 0 && nextPool) {
                console.log('Amount ran out')
                return { swaps, sums: false }
            }

            swaps.push({
                path,
                pool: pool.name,
                token0: pool.tokenLeft,
                token1: pool.tokenRight,
                price: pool.curPrice,
                next: nextPool ? nextPool.name : null,
                op: zeroForOne ? 'buy' : 'sell',
                in: Math.abs(sums[0]),
                out: Math.abs(sums[1]),
                cLiq: pool.curLiq,
                cPricePoint: pool.curPP,
                cPrice: pool.curPrice,
                cLeft: pool.curLeft,
                cRight: pool.curRight
            })
        }
        return { swaps, sums: sumsTotal }
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

    isZero(amount) {
        return Math.abs(amount) < 1e-10
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
