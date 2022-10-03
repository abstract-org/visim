import { Graph } from './Graph.class'
import { byName } from "../Utils/logicUtils";

export default class Router {
    #state = { quests: [], pools: [] }
    #shouldScanPaths = true

    #FOUND_PATHS = []
    #_PRICED_PATHS = []
    #_VISITED_PATHS = []
    #_SWAPS = []
    #_DEFAULT_SWAP_SUM = 10
    #_SWAP_SUM_MAX_CHUNKS = 100
    #_SWAP_SUM_STEPPER = 10000

    /* eslint-disable no-loop-func */
    #DEBUG = false
    #DEBUG_DRY = false

    #_visitedForGraph = []

    // @param State state
    constructor(stateQuests, statePools, debug = false, debugDry = false) {
        this.#state = { quests: stateQuests, pools: statePools }
        this.#DEBUG = debug
        this.#DEBUG_DRY = debugDry
    }

    /**
     * @param {string} token0
     * @param {string} token1
     * @param {number} amountIn
     * @returns {*[]|number[]}
     */
    smartSwap(token0, token1, amountIn) {
        if (this.#DEBUG)
            console.log(
                `\n--- SMART ROUTE ${token0}/${token1}/${amountIn}---\n`
            )
        this.#_SWAPS = []
        this.#_VISITED_PATHS = []
        this.#_visitedForGraph = []

        const totalInOut = [0, 0]
        const poolList = this.findPoolsFor(token0)
        if (this.#DEBUG) console.log(poolList)
        const graph = this.graphPools(poolList)
        if (this.#DEBUG) console.log(graph)
        this.#FOUND_PATHS = graph.buildPathways(token0, token1)
        if (this.#DEBUG) console.log(this.#FOUND_PATHS)

        if (amountIn > this.#_SWAP_SUM_STEPPER) {
            this.#_DEFAULT_SWAP_SUM = amountIn / this.#_SWAP_SUM_MAX_CHUNKS
        } else {
            this.#_DEFAULT_SWAP_SUM = this.#_SWAP_SUM_MAX_CHUNKS
        }

        do {
            this.#_PRICED_PATHS = this.drySwapForPricedPaths(this.#FOUND_PATHS)
            if (this.#DEBUG) console.log(this.#_PRICED_PATHS, amountIn)
            if (!this.#_PRICED_PATHS.length) return []

            //const sums = [amountIn < 10 ? -amountIn : -10, 10]
            const sums = this.swapBestPath(amountIn, this.#_PRICED_PATHS[0])

            amountIn += sums[0]
            totalInOut[0] += sums[0]
            totalInOut[1] += sums[1]
            // console.log('visited_graph', this.#_visitedForGraph.length)
            // console.log('paths', this.#FOUND_PATHS.length)
            // console.log('priced_paths', this.#_PRICED_PATHS.length)
            // console.log('visited_swap', this.#_VISITED_PATHS.length)
            // console.log('swaps', this.#_SWAPS.length)
            // console.log('amountIn', amountIn)

            if (!this.#_VISITED_PATHS.includes(this.#_PRICED_PATHS[0])) {
                this.#_VISITED_PATHS.push(this.#_PRICED_PATHS[0])
            }
        } while (
            !this.isZero(amountIn) &&
            amountIn > 0 &&
            !this.#isNearZero(amountIn) &&
            this.#_PRICED_PATHS.length
        )

        console.log('smart swap', token0, token1, totalInOut)

        return totalInOut
    }

    swapBestPath(amount, pricedPath) {
        if (!pricedPath) return

        //const t1 = performance.now()

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

        // const t2 = performance.now()
        // console.log(
        //     `Executed smartSwap of ${amount} in ${pricedPath.path} in ${
        //         t2 - t1
        //     }ms`
        // )

        return [allSums.in, allSums.out]
    }

    drySwapForPricedPaths(paths) {
        //const t1 = performance.now()
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

        // const t2 = performance.now()

        // console.log(`Executed drySwapForPricedPaths in ${t2 - t1}ms`)
        return pathPrices
    }

    graphPools(poolList) {
        const graph = new Graph()
        poolList.forEach((pool) => {
            if (!graph.adjList.has(pool.tokenLeft.name)) {
                graph.addVertex(pool.tokenLeft.name)
            }

            if (!graph.adjList.has(pool.tokenRight.name)) {
                graph.addVertex(pool.tokenRight.name)
            }
        })

        poolList.forEach((pool) => {
            graph.addEdge(pool.tokenLeft.name, pool.tokenRight)
        })

        return graph
    }

    /**
     * @param {string} tokenName
     * @param {number} depth
     * @returns {[]|*[]}
     */
    findPoolsFor(tokenName, depth = 0) {
        let results = this.#processTokenForPath(tokenName)

        if (depth > 3 && this.#shouldScanPaths) {
            this.#shouldScanPaths = false
            return results
        }

        results.forEach((res) => {
            const leftPools = this.findPoolsFor(res.tokenLeft.name, depth + 1)
            const rightPools = this.findPoolsFor(res.tokenRight.name, depth + 1)

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
                if (!this.#_VISITED_PATHS.includes(pathString)) {
                    this.#_VISITED_PATHS.push(pathString)
                }
            }

            amount += sums[0]
            this.#_SWAPS = [...this.#_SWAPS, ...swaps]

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
                pool.tokenLeft === poolTokens[0] ? true : false

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

    getPaths() {
        return this.#_VISITED_PATHS
    }

    getSwaps() {
        return this.#_SWAPS
    }

    #processTokenForPath(tokenName) {
        let quest = this.#state.quests.find(byName(tokenName))
        if (!quest) {
            return []
        }

        let candidatePools = quest.pools

        if (!candidatePools || candidatePools.length <= 0) {
            return []
        }

        const result = []
        candidatePools.forEach((candidate) => {
            const pool = this.#state.pools.find(byName(candidate))
            if (this.#_visitedForGraph.includes(pool.name)) {
                return
            }

            this.#_visitedForGraph.push(pool.name)

            result.push({
                for: tokenName,
                tokenLeft: this.#state.quests.find(byName(pool.tokenLeft)),
                tokenRight: this.#state.quests.find(byName(pool.tokenRight)),
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
        return this.#state.pools.some(byName(`${tokenA}-${tokenB}`))
            ? this.#state.pools.find(byName(`${tokenA}-${tokenB}`))
            : this.#state.pools.find(byName`${tokenB}-${tokenA}`)
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
