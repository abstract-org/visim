import { Graph } from './Graph.class'
export default class Router {
    #state = []
    #visitedPools = []
    #shouldScanPaths = true

    // @param State state
    constructor(state) {
        this.#state = state
    }

    findPoolsByToken(tokenName) {
        if (!this.#state || this.#state.pools.count() <= 0) {
            return []
        }

        const pools = []

        this.#state.pools.forEach((pool) => {
            if (
                pool.tokenLeft.name === tokenName ||
                pool.tokenRight.name === tokenName
            ) {
                pools.push(pool)
            }
        })

        return pools
    }

    // A -> [A,D], [C,A->D,C], [A,B->E,B->DE], [A,B->C,B->C,E->D,E]
    orderFor(tokenA, tokenB, swaps) {
        const graph = new Graph()
        const vertices = []

        swaps.forEach((swap) => {
            if (!vertices.includes(swap.for)) {
                vertices.push(swap.for)
                graph.addVertex(swap.for)
            }

            if (swap.for !== swap.tokenLeft) {
                graph.addEdge(swap.for, swap.tokenLeft)
            }

            if (swap.for !== swap.tokenRight) {
                graph.addEdge(swap.for, swap.tokenRight)
            }
        })

        return graph
    }

    drySwapAllForToken(tokenName, amount) {
        const quest = this.#state.quests.get(tokenName)
        quest.pools.forEach((pool) => {
            console.log(pool.tokenLeft.name, pool.tokenRight.name)
        })
    }

    drySwapForPaths(tokenName, amount, depth = 0) {
        let results = this.#processTokenForPath(tokenName, amount)

        if (depth > 3 && this.#shouldScanPaths) {
            this.#shouldScanPaths = false
            return results
        }

        results.forEach((swap) => {
            const swapsLeft = this.drySwapForPaths(
                swap.tokenLeft,
                amount,
                depth + 1
            )
            const swapsRight = this.drySwapForPaths(
                swap.tokenRight,
                amount,
                depth + 1
            )

            results = Array.prototype.concat(results, swapsLeft, swapsRight)
        })

        return results
    }

    #processTokenForPath(tokenName, amount) {
        let candidatePools = this.#state.quests.get(tokenName).pools

        if (!candidatePools || candidatePools.length <= 0) {
            return []
        }

        const result = []
        candidatePools.forEach((pool) => {
            if (this.#visitedPools.includes(pool.name)) {
                // console.log(`${pool.name} exists in visited, skipping`)
                return
            }

            const [totalIn, totalOut] = pool.dryBuy(amount)
            const tokenLeft = pool.tokenLeft.name
            const tokenRight = pool.tokenRight.name

            this.#visitedPools.push(pool.name)

            result.push({
                for: tokenName,
                tokenLeft,
                tokenRight,
                totalIn,
                totalOut
            })
        })

        return result
    }
}
