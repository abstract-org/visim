export default class Router {
    #state = []

    // @param State state
    constructor(state) {
        this.#state = state
    }

    findTokenInPools(tokenName) {
        if (!this.#state || this.#state.pools.count() <= 0) {
            return []
        }

        const pools = []
        
        this.#state.pools.forEach((pool, poolName) => {
            if (pool.tokenLeft.name === tokenName || pool.tokenRight.name === tokenName) {
                pools.push(poolName)
            }
        })

        return pools
    }
}