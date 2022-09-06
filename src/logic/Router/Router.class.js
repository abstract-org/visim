/* eslint-disable no-loop-func */
import { Graph } from './Graph.class'
export default class Router {
    #state = []
    #visitedPools = []
    #swaps = []
    #paths = []
    #shouldScanPaths = true

    // @param State state
    constructor(state) {
        this.#state = state
    }

    smartSwap(token0, token1, amountIn, chunkSize = 10) {
        this.#visitedPools = []
        this.#swaps = []
        this.#paths = []
        const poolList = this.findPoolsFor(token0)
        const graph = this.graphPools(poolList)
        const paths = graph.buildPathways(token0, token1)
        const swapData = this.drySwapAllForAmounts(paths, chunkSize)
        const [sortedPrices, pricedPaths] = this.sortByBestPrice(swapData)

        let sums = this.smartSwapPaths(
            pricedPaths,
            sortedPrices,
            amountIn,
            chunkSize
        )

        if (!sums) {
            return []
        }

        return [-sums[0], sums[1]]
    }

    smartSwapPaths(pricedPaths, sortedPrices, amount, chunkSize = 10) {
        const chunks = this.#chunkAmountBy(amount, chunkSize)

        let balancesResult = []
        let curPricePoint = 0
        let maxPricePoint = sortedPrices.length - 1
        let price = sortedPrices[curPricePoint]
        let path = pricedPaths[price]
        let nextPrice = sortedPrices[curPricePoint + 1]
            ? sortedPrices[curPricePoint + 1]
            : price
        let outPrice = 0
        let pathsUsed = []

        for (const chunk of chunks) {
            // loop sortedPrices
            const { sums, swaps } = this.swapForAmounts(path, chunk, false)
            if (sums) {
                outPrice = this.#getOutInPrice(chunk, sums[0])

                balancesResult = this.#calculateBalances(
                    balancesResult,
                    path,
                    sums[1],
                    sums[0]
                )

                // Re-enter chunk into loop during path change to avoid skipping it
                if (sums[0] === 0) {
                    chunks.push(chunkSize)
                } else {
                    let pathString = path.join('-')
                    if (!this.#paths.includes(pathString)) {
                        this.#paths.push(pathString)
                    }
                }
            }

            if (!sums) {
                return balancesResult
            }

            if (outPrice >= nextPrice && sortedPrices.length > 1) {
                curPricePoint += 1
                if (curPricePoint > maxPricePoint) {
                    console.log('Peaked sorted prices')
                    return balancesResult
                }
                price = sortedPrices[curPricePoint]
                path = pricedPaths[price]
                nextPrice = sortedPrices[curPricePoint + 1]
                    ? sortedPrices[curPricePoint + 1]
                    : null
            }

            amount += sums[0]
            this.#swaps.push(swaps)
        }

        return balancesResult
    }

    swapForAmounts(path, amount, dry = false) {
        if (!path) return { swaps: false, sums: false }

        const poolPairs = path.map((token, id) => [token, path[id + 1]])
        const swaps = []
        let sums = []

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

            if (!pool) {
                continue
            }

            const zeroForOne =
                pool.tokenLeft.name === poolTokens[0] ? true : false

            sums = dry
                ? pool.drySwap(amount, zeroForOne)
                : pool.swap(amount, zeroForOne)

            if (Math.abs(sums[0]) === Math.abs(sums[1])) {
                return { swaps, sums }
            }

            if (amount >= Math.abs(sums[1])) {
                amount = Math.abs(sums[1])
            }

            if (amount <= 0 && nextPool) {
                console.log('Amount ran out')
                return { swaps, sums }
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

        return { sums, swaps }
    }

    drySwapAllForAmounts(paths, amount) {
        let swapsRes = []
        const dry = true
        paths.forEach((path) => {
            const { swaps } = this.swapForAmounts(path, amount, dry)
            if (swaps) {
                swapsRes.push(swaps)
            }
        })

        return swapsRes
    }

    sortByBestPrice(swaps) {
        let sortedPrices = []
        let pricedPaths = {}
        swaps.forEach((swapPath) => {
            if (swapPath.length <= 0) {
                return // @TODO: What is this edge case after citing a quest and trying to sell token for USDC?
            }

            const amtIn = swapPath[0].in
            const amtOut = swapPath[swapPath.length - 1].out
            const price = this.#getOutInPrice(amtIn, amtOut)

            sortedPrices.push(price)
            pricedPaths[price] = swapPath[0].path
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
        return this.#paths
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

    #calculateBalances(balancesResult, path, out, chunk) {
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

    #getOutInPrice(out, inAmt) {
        return out / inAmt
    }

    #getPoolByTokens(tokenA, tokenB) {
        return this.#state.pools.has(`${tokenA}-${tokenB}`)
            ? this.#state.pools.get(`${tokenA}-${tokenB}`)
            : this.#state.pools.get(`${tokenB}-${tokenA}`)
    }

    #chunkAmountBy(amount, by) {
        const max = Math.floor(amount / by)
        const mod = amount % by

        const chunks = Array(max).fill(by)

        if (mod > 0) {
            chunks.push(mod)
        }

        return chunks
    }
}
