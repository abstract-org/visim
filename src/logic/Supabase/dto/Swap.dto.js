export class SwapDto {
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

    constructor(data) {
        this.action = data.action || 'UNKNOWN'
        this.amount_in = data.totalAmountIn
        this.amount_out = data.totalAmountOut
        this.day = data.day || 0
        this.block = data.block || 0
        this.path = data.paths
        this.investor_id = data.investor_id
        this.pool_id = data.pool_id
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
            pool_id: this.pool_id
        }
    }
}

export class DownloadSwapDto extends SwapDto {
    /** @type {number} */
    id

    constructor(data) {
        super(data)
        this.amount_in = data.amount_in
        this.amount_out = data.amount_out
        this.id = data.id
    }

    toObj() {
        return {
            id: this.id,
            action: this.action,
            totalAmountIn: this.amount_in,
            totalAmountOut: this.amount_out,
            day: this.day,
            block: this.block,
            paths: this.path,
            investor_id: this.investor_id,
            pool_id: this.pool_id
        }
    }
}
