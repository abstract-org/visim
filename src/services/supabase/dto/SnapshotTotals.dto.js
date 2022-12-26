export class SnapshotTotalsDto {
    /** @type {number} */
    id
    /** @type {number} */
    snapshot_id
    /** @type {number} */
    quests
    /** @type {number} */
    cross_pools
    /** @type {number} */
    investors
    /** @type {number} */
    tvl
    /** @type {number} */
    mcap
    /** @type {number} */
    usdc

    constructor(data) {
        this.id = data.id
        this.snapshot_id = data.snapshot_id
        this.quests = data.quests
        this.cross_pools = data.cross_pools
        this.investors = data.investors
        this.tvl = data.tvl
        this.mcap = data.mcap
        this.usdc = data.usdc
    }

    toObj() {
        return {
            id: this.id,
            snapshot_id: this.snapshot_id,
            quests: this.quests,
            cross_pools: this.cross_pools,
            investors: this.investors,
            tvl: this.tvl,
            mcap: this.mcap,
            usdc: this.usdc
        }
    }
}

export class SnapshotTotalsUploadDto {
    /** @type {number} */
    snapshot_id
    /** @type {number} */
    quests
    /** @type {number} */
    cross_pools
    /** @type {number} */
    investors
    /** @type {number} */
    tvl
    /** @type {number} */
    mcap
    /** @type {number} */
    usdc

    constructor(data) {
        this.snapshot_id = data.snapshot_id
        this.quests = data.quests
        this.cross_pools = data.cross_pools
        this.investors = data.investors
        this.tvl = Math.round(data.tvl)
        this.mcap = Math.round(data.mcap)
        this.usdc = Math.round(data.usdc)
    }

    toObj() {
        return {
            snapshot_id: this.snapshot_id,
            quests: this.quests,
            cross_pools: this.cross_pools,
            investors: this.investors,
            tvl: this.tvl,
            mcap: this.mcap,
            usdc: this.usdc
        }
    }
}
