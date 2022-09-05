// Static/Read-only token for us
export default class UsdcToken {
    name
    pools = []

    constructor() {
        this.name = 'USDC'
    }

    addPool(pool) {
        if (this.pools.find((exPool) => exPool.name === pool.name)) return

        this.pools.push(pool)
    }
}
