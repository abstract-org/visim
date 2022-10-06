// Static/Read-only token for us
export default class UsdcToken {
    name
    pools = []

    constructor() {
        if (!UsdcToken._instance) {
            // singleton
            this.name = 'USDC'
            UsdcToken._instance = this
        }

        return UsdcToken._instance
    }

    addPool(pool) {
        if (
            this.pools.find(
                (existingPoolName) => existingPoolName === pool.name
            )
        )
            return

        this.pools.push(pool.name)
    }

    truncate() {
        this.pools = []
    }
}
