/* eslint-disable no-loop-func */
import { Graph } from './Graph.class'

export default class Router {
    #state = []
    #visitedPools = []
    #swaps = []
    #paths = []
    #pathsVisited = []
    #outSums = [0, 0]
    #shouldScanPaths = true
    #DEBUG = false
    #DEBUG_DRY = false
    #DRY_SWAP_CHUNK_SIZE = 10

    // @param State state
    constructor(state = null, debug = false, debugDry = false) {
        this.#state = state
        this.#DEBUG = debug
        this.#DEBUG_DRY = debugDry
        this.#visitedPools = []
        this.#swaps = []
        this.#paths = []
        this.#pathsVisited = []
    }

    smartSwap(token0, token1, amountIn, chunkSize = 10, initial = false) {
        this.#visitedPools = []
        this.#paths = []

        if (initial) {
            console.log('new swap ' + amountIn)
            this.#swaps = []
            this.#pathsVisited = []
        }
        const poolList = this.findPoolsFor(token0)
        if (this.#DEBUG) console.log(poolList)
        const graph = this.graphPools(poolList)
        if (this.#DEBUG) console.log(graph)
        this.#paths = graph.buildPathways(token0, token1)
        if (this.#DEBUG) console.log(this.#paths)
        const swapData = this.drySwapAllForAmounts(
            this.#paths,
            this.#DRY_SWAP_CHUNK_SIZE
        )
        if (this.#DEBUG && this.#DEBUG_DRY) console.log(swapData)
        const [sortedPrices, pricedPaths] = this.sortByBestPrice(swapData)

        if (Object.keys(pricedPaths).length <= 0) {
            return []
        }

        if (this.#DEBUG) console.log(sortedPrices, pricedPaths, amountIn)

        let sums = this.smartSwapPaths(
            pricedPaths,
            sortedPrices,
            amountIn,
            chunkSize
        )

        if (!sums) {
            return []
        }

        this.#outSums[0] += sums[0]
        this.#outSums[1] += sums[1]
        console.log(this.#outSums, amountIn, chunkSize, this.getPaths())
        if (typeof sums[0] === 'number' && sums[0] < amountIn) {
            return this.smartSwap(token0, token1, amountIn - sums[0], chunkSize)
        }

        return [-this.#outSums[0], this.#outSums[1]]
    }

    smartSwapPaths(pricedPaths, sortedPrices, amount, chunkSize = 10) {
        let chunks = this.chunkAmountBy(amount, chunkSize)
        let balancesResult = []

        let curPricePoint = sortedPrices.length - 1
        let maxPricePoint = 0
        let price = sortedPrices[curPricePoint]
        let nextPrice = sortedPrices[curPricePoint - 1]
            ? sortedPrices[curPricePoint - 1]
            : null
        let outPrice = 0

        let path = Object.keys(pricedPaths)
            .find((key) => pricedPaths[key] === price)
            .split(',')

        for (const [id, chunk] of chunks.entries()) {
            // traverse sortedPrices
            const { sums, swaps } = this.swapInPath(path, chunk, false)

            if (!sums) {
                return balancesResult
            }

            if (this.#DEBUG) {
                console.log(
                    'Single swap',
                    sums,
                    path,
                    'swaps length',
                    swaps.length
                )
            }

            outPrice = this.#getOutInPrice(sums[0], sums[1])

            if ((nextPrice && outPrice <= nextPrice) || isNaN(outPrice)) {
                curPricePoint -= 1
                if (curPricePoint < maxPricePoint) {
                    if (this.#DEBUG) console.log('Peaked sorted prices')
                    return balancesResult
                }

                price = sortedPrices[curPricePoint]
                nextPrice = sortedPrices[curPricePoint - 1]
                    ? sortedPrices[curPricePoint - 1]
                    : null
                path = Object.keys(pricedPaths)
                    .find((key) => pricedPaths[key] === price)
                    .split(',')
            }

            balancesResult = this.#calculateBalances(
                balancesResult,
                sums[1],
                sums[0]
            )

            // @TODO: We want to record only paths that yielded results, we skip abrupted chains
            if (sums && !(sums[0] === 0 && sums[1] === 0)) {
                let pathString = path.join('-')
                if (!this.#pathsVisited.includes(pathString)) {
                    this.#pathsVisited.push(pathString)
                }
            }

            amount += sums[0]
            this.#swaps = [...this.#swaps, ...swaps]

            // @TODO: Extends chunks until runs out of amount (not optimal, needs amount per path formula)
            if (amount >= chunkSize && id + 1 === chunks.length) {
                chunks.push(chunkSize)
            }
        }

        return balancesResult
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

            const zeroForOne =
                pool.tokenLeft.name === poolTokens[0] ? true : false

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
                token0: pool.tokenLeft.name,
                token1: pool.tokenRight.name,
                price: pool.currentPrice,
                next: nextPool ? nextPool.name : null,
                op: zeroForOne ? 'buy' : 'sell',
                in: Math.abs(sums[0]),
                out: Math.abs(sums[1]),
                cLiq: pool.currentLiquidity,
                cPricePoint: pool.currentPricePoint,
                cPrice: pool.currentPrice,
                cLeft: pool.currentLeft,
                cRight: pool.currentRight
            })
        }
        return { swaps, sums: sumsTotal }
    }

    drySwapAllForAmounts(paths, amount) {
        let swapsRes = []
        const dry = true
        paths.forEach((path) => {
            const { swaps, sums } = this.swapInPath(path, amount, dry)
            if (swaps) {
                if (
                    swaps.length < path.length - 1 ||
                    !sums ||
                    (sums && (sums[0] === 0 || sums[1] === 0))
                ) {
                    if (this.#DEBUG && this.#DEBUG_DRY) {
                        console.log(
                            '[DRY] PATH ' +
                                path +
                                ' is not qualified for smart routing' +
                                ' with sums ' +
                                sums[0] +
                                ' and ' +
                                sums[1]
                        )
                    }
                    return
                }
                swapsRes.push(swaps)
            }
        })

        return swapsRes
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

    graphPools(poolList) {
        const graph = new Graph()
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

    findPoolsFor(tokenName, depth = 0) {
        let results = this.#processTokenForPath(tokenName)

        if (depth > 3 && this.#shouldScanPaths) {
            this.#shouldScanPaths = false
            return results
        }

        results.forEach((res) => {
            const leftPools = this.findPoolsFor(res.tokenLeft, depth + 1)
            const rightPools = this.findPoolsFor(res.tokenRight, depth + 1)

            results = Array.prototype.concat(results, leftPools, rightPools)
        })

        return results
    }

    getPaths() {
        return this.#pathsVisited
    }

    getSwaps() {
        return this.#swaps
    }

    #processTokenForPath(tokenName) {
        let quest = this.#state.quests.get(tokenName)
        if (!quest) {
            return []
        }

        let candidatePools = quest.pools

        if (!candidatePools || candidatePools.length <= 0) {
            return []
        }

        const result = []
        candidatePools.forEach((pool) => {
            if (this.#visitedPools.includes(pool.name)) {
                return
            }

            const tokenLeft = pool.tokenLeft.name
            const tokenRight = pool.tokenRight.name

            this.#visitedPools.push(pool.name)

            result.push({
                for: tokenName,
                tokenLeft,
                tokenRight
            })
        })

        return result
    }

    #calculateBalances(balancesResult, out, chunk) {
        if (!balancesResult[0]) {
            balancesResult[0] = 0
        }

        if (!balancesResult[1]) {
            balancesResult[1] = 0
        }

        balancesResult[0] -= chunk
        balancesResult[1] += out

        return balancesResult
    }

    #getOutInPrice(inAmt, outAmt) {
        return Math.abs(outAmt) / Math.abs(inAmt)
    }

    #getPoolByTokens(tokenA, tokenB) {
        return this.#state.pools.has(`${tokenA}-${tokenB}`)
            ? this.#state.pools.get(`${tokenA}-${tokenB}`)
            : this.#state.pools.get(`${tokenB}-${tokenA}`)
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
}
