import { Graph } from './Graph.class'
export default class Router {
    #state = []
    #visitedPools = []
    #shouldScanPaths = true

    // @param State state
    constructor(state) {
        this.#state = state
    }

    graphPools(swaps) {
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

    findPathways(tokenIn, tokenOut, graph) {
        let results = []

        // scan family for tOut -> tIn+tOut
        // store family
        // scan siblings for tOut (if not tOut) tIn+tSib+tOut
        // scan next family
        const family = graph.adjList.get(tokenIn)

        if (!family) {
            return results
        }

        console.log(graph)
        graph.adjList.forEach((family) => {
            results = this.#processGraphPart(tokenIn, tokenOut, family, graph)
        })
    }

    #processGraphPart(tokenIn, tokenOut, family, graph) {
        let subResults = []
        let subFamily = [...family]
        if (family.indexOf(tokenIn) !== -1) {
            subResults.push({ tokenIn, tokenOut })
        }

        subFamily.forEach((childToken) => {
            if (
                graph.adjList.get(childToken) &&
                graph.adjList.get(childToken).indexOf(tokenOut) !== -1 &&
                childToken !== tokenOut
            ) {
                subResults.push([
                    { tokenIn, childToken },
                    { childToken, tokenOut }
                ])
            }
        })

        subFamily.splice(subFamily.indexOf(tokenIn), 1)
        console.log(`Would process ${subFamily} for ${tokenIn}`)
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
}
