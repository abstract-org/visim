/* eslint-disable no-loop-func */
import { Graph } from './Graph.class'
export default class Router {
    #state = []
    #visitedPools = []
    #shouldScanPaths = true

    // @param State state
    constructor(state) {
        this.#state = state
    }

    smartSwap(token0, token1, amountIn, chunkSize = 10) {
        this.#visitedPools = []
        const poolList = this.findPoolsFor(token0)
        const graph = this.graphPools(poolList)
        const paths = graph.buildPathways(token0, token1)
        const swapData = this.drySwapAllForAmounts(paths, amountIn)
        const [sortedPrices, pricedPaths] = this.sortByBestPrice(swapData)

        const balancesResult = this.smartSwapPaths(
            pricedPaths,
            sortedPrices,
            amountIn,
            chunkSize
        )

        console.log(token0, token1, amountIn, balancesResult)
        return balancesResult
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

        for (const chunk of chunks) {
            // loop sortedPrices
            const response = this.swapForAmounts(path, chunk, false)
            if (response) {
                outPrice = this.#getOutInPrice(chunk, response[0])

                balancesResult = this.#calculateBalances(
                    balancesResult,
                    path,
                    response[0][1],
                    response[0][0]
                )
            }

            if (!response) {
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

            amount -= chunk
        }

        return balancesResult
    }

    swapForAmounts(path, amount, dry = false) {
        if (!path) return

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
                console.log('Empty pool', pool.name, sums[0], sums[1])
                return
            }

            if (amount >= Math.abs(sums[1])) {
                amount = Math.abs(sums[1])
            }

            if (amount <= 0 && nextPool) {
                console.log('Amount ran out')
                return
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

        return [sums, swaps]
    }

    drySwapAllForAmounts(paths, amount) {
        let swaps = []
        const dry = true
        paths.forEach((path) => {
            const result = this.swapForAmounts(path, amount, dry)

            if (result && result[1]) {
                swaps.push(result[1])
            }
        })

        return swaps
    }

    sortByBestPrice(swaps) {
        let sortedPrices = []
        let pricedPaths = {}
        swaps.forEach((swapPath) => {
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
        const vertices = []

        poolList.forEach((poolDep) => {
            if (!vertices.includes(poolDep.for)) {
                vertices.push(poolDep.for)
                graph.addVertex(poolDep.for)
            }

            if (poolDep.for !== poolDep.tokenLeft) {
                graph.addEdge(poolDep.for, poolDep.tokenLeft)
            }

            if (poolDep.for !== poolDep.tokenRight) {
                graph.addEdge(poolDep.for, poolDep.tokenRight)
            }
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
        if (!balancesResult[path[0]]) {
            balancesResult[path[0]] = 0
        }

        if (!balancesResult[path[path.length - 1]]) {
            balancesResult[path[path.length - 1]] = 0
        }

        balancesResult[path[0]] -= chunk
        balancesResult[path[path.length - 1]] += out

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
