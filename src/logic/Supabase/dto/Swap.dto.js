export class SwapDto {
    /** @type {number} */
    id
    /** @type {string} */
    action
    /** @type {number} */
    amount_in
    /** @type {number} */
    amount_out
    /** @type {number} */
    day
    /** @type {number} */
    block
    /** @type {number} */
    investorHash
    /** @type {string} */
    path
    /** @type {string} */
    pool
    /** @type {number} */
    price

    constructor(data, poolNames, investorHashes) {
        //     price: '1.440',
        this.price = data.price
        //     mcap: 28790,
        this.mcap = data.mcap
        this.tvl = data.tvl
        this.opName = data.op_name

        this.id = data.id
        this.pool = poolNames.get(data.pool_id)
        this.investorHash = investorHashes.get(data.investor_id)
        this.action = data.action
        this.totalAmountIn = data.amount_in
        this.totalAmountOut = data.amount_out
        this.day = data.day
        this.block = data.block
        this.paths = data.path
    }

    toObj() {
        return {
            pool: this.pool,
            price: this.price,
            investorHash: this.investorHash,
            action: this.action,
            mcap: this.mcap,
            tvl: this.tvl,
            totalAmountIn: this.totalAmountIn,
            totalAmountOut: this.totalAmountOut,
            paths: this.paths,
            day: this.day,
            opName: this.opName
        }
    }
}

export class SwapUploadDto {
    /** @type {string} */
    action
    /** @type {number} */
    amount_in
    /** @type {number} */
    amount_out
    /** @type {number} */
    day
    /** @type {number} */
    block
    /** @type {number} */
    investor_id
    /** @type {string} */
    path
    /** @type {number} */
    pool_id

    constructor(data, poolMappings, investorMappings) {
        this.action = data.action || 'UNKNOWN'
        this.amount_in = data.totalAmountIn
        this.amount_out = data.totalAmountOut
        this.day = data.day || 0
        this.block = data.block || 0
        this.path = data.paths
        this.pool_id = poolMappings.get(data.pool)
        this.investor_id = investorMappings.get(data.investorHash)
        this.price = data.price
        this.mcap = data.mcap
        this.tvl = data.tvl
        this.op_name = data.opName
    }

    toObj() {
        return {
            action: this.action,
            amount_in: Number(this.amount_in),
            amount_out: Number(this.amount_out),
            day: this.day,
            block: this.block,
            path: this.path,
            investor_id: this.investor_id,
            pool_id: this.pool_id,
            price: this.price,
            mcap: this.mcap,
            tvl: this.tvl,
            op_name: this.opName
        }
    }
}
