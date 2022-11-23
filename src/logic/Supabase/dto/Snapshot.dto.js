export class SnapshotDto {
    /** @type {number} */
    id
    /** @type {string} */
    seed
    /** @type {number} */
    scenario_id
    /** @type {Date} */
    created_at

    constructor(data) {
        this.id = data.id
        this.seed = data.seed
        this.scenario_id = data.scenario_id || null
        this.created_at = data.created_at
    }

    toObj() {
        return {
            id: this.id,
            seed: this.seed,
            scenario_id: this.scenario_id,
            created_at: this.created_at
        }
    }
}

export class SnapshotUploadDto {
    /** @type {string} */
    seed
    /** @type {number} */
    scenario_id

    constructor(data) {
        this.seed = data.seed
        this.scenario_id = data.scenarioId
    }

    toObj() {
        return {
            seed: this.seed,
            scenario_id: this.scenario_id
        }
    }
}

export class SnapshotWithTotalsDto extends SnapshotDto {
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
        super(data)
        const totalsData = data.snapshot_totals[0]
        if (totalsData) {
            this.quests = totalsData.quests
            this.cross_pools = totalsData.cross_pools
            this.investors = totalsData.investors
            this.tvl = totalsData.tvl
            this.mcap = totalsData.mcap
            this.usdc = totalsData.usdc
        }
    }

    toObj() {
        return {
            id: this.id,
            seed: this.seed,
            scenario_id: this.scenario_id,
            created_at: this.created_at,
            quests: this.quests,
            cross_pools: this.cross_pools,
            investors: this.investors,
            tvl: this.tvl,
            mcap: this.mcap,
            usdc: this.usdc
        }
    }
}
