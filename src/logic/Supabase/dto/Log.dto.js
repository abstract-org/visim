export class LogDto {
    /** @type {number} */
    id
    /** @type {number} */
    pool_id
    /** @type {string} */
    pool_name
    /** @type {number} */
    investor_id
    /** @type {string} */
    investor_hash
    /** @type {number} */
    swap_id
    /** @type {string} */
    action
    /** @type {number} */
    day
    /** @type {number} */
    mcap
    /** @type {string} */
    op_name
    /** @type {number} */
    total_amount_in
    /** @type {number} */
    total_amount_out
    /** @type {number} */
    tvl

    constructor(data) {
        this.id = data.id
        this.pool_id = data.pool_id
        this.pool_name = data.pool.name
        this.investor_id = data.investor_id
        this.investor_hash = data.investor.hash
        this.swap_id = data.swap_id
        this.action = data.action
        this.day = data.day
        this.mcap = data.mcap
        this.tvl = data.tvl
        this.op_name = data.op_name
        this.total_amount_in = data.total_amount_in
        this.total_amount_out = data.total_amount_out
    }

    toObj() {
        return {
            action: this.action,
            day: this.day,
            investorHash: this.investor_hash,
            mcap: this.mcap,
            opName: this.op_name,
            paths: this.pool_name,
            pool: this.pool_name,
            price: null,
            totalAmountIn: this.total_amount_in,
            totalAmountOut: this.total_amount_out,
            tvl: this.tvl
        }
    }
}

export class LogUploadDto {
    /** @type {number} */
    pool_id
    /** @type {number} */
    investor_id
    /** @type {number} */
    swap_id
    /** @type {string} */
    action
    /** @type {number} */
    day

    constructor(data, poolMappings, investorMappings) {
        this.pool_id = poolMappings.get(data.pool)
        this.investor_id = investorMappings.get(data.investorHash)
        this.action = data.action
        this.day = data.day
        this.tvl = data.tvl
        this.mcap = data.mcap
        this.op_name = data.opName
        this.total_amount_in = data.totalAmountIn
        this.total_amount_out = data.totalAmountOut
    }

    toObj() {
        return {
            pool_id: this.pool_id,
            investor_id: this.investor_id,
            action: this.action,
            day: this.day,
            mcap: this.mcap,
            tvl: this.tvl,
            op_name: this.op_name,
            total_amount_in: this.total_amount_in,
            total_amount_out: this.total_amount_out
        }
    }
}
