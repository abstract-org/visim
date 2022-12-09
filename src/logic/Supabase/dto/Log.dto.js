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
    /** @type {string} */
    price
    /** @type {number} */
    total_amount_in
    /** @type {number} */
    total_amount_out
    /** @type {number} */
    tvl
    /** @type {number} */
    blk

    constructor(data) {
        this.id = data.id
        this.blk = data.blk
        this.pool_id = data.pool_id
        this.pool_name = data.pool?.name
        this.investor_id = data.investor_id
        this.investor_hash = data.investor?.hash
        this.swap_id = data.swap_id
        this.action = data.action
        this.day = data.day
        this.mcap = data.mcap
        this.tvl = data.tvl
        this.op_name = data.op_name
        this.price = data.price || null
        this.total_amount_in = data.total_amount_in
        this.total_amount_out = data.total_amount_out
    }

    toObj() {
        return {
            blk: this.blk,
            action: this.action,
            day: this.day,
            investorHash: this.investor_hash,
            mcap: this.mcap,
            opName: this.op_name,
            paths: this.pool_name,
            pool: this.pool_name,
            price: this.price,
            totalAmountIn: this.total_amount_in,
            totalAmountOut: this.total_amount_out,
            tvl: this.tvl
        }
    }
}

export class LogUploadDto {
    pool_id
    investor_id
    action
    day
    tvl
    mcap
    op_name
    price
    total_amount_in
    total_amount_out
    blk

    constructor(data, poolMappings, investorMappings, idx) {
        this.blk = idx
        this.pool_id = poolMappings.get(data.pool)
        this.investor_id = investorMappings.get(data.investorHash)
        this.action = data.action
        this.day = data.day
        this.tvl = data.tvl || 0
        this.mcap = data.mcap || 0
        this.op_name = data.opName
        this.price = data.price
        this.total_amount_in = data.totalAmountIn
        this.total_amount_out = data.totalAmountOut
    }

    toObj() {
        return {
            blk: this.blk,
            pool_id: this.pool_id,
            investor_id: this.investor_id,
            action: this.action,
            day: this.day,
            mcap: this.mcap,
            tvl: this.tvl,
            op_name: this.op_name,
            price: this.price,
            total_amount_in: this.total_amount_in,
            total_amount_out: this.total_amount_out
        }
    }
}
