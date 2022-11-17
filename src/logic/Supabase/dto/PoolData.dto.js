export class PoolDataDto {
    /** @type {number} */
    id
    /** @type {number} */
    swap_id
    /** @type {number} */
    pool_id
    /** @type {number} */
    current_liquidity
    /** @type {number} */
    current_price
    /** @type {number} */
    current_price_point_lg2
    /** @type {number} */
    current_left_lg2
    /** @type {number} */
    current_right_lg2
    /** @type {number} */
    token0_price
    /** @type {number} */
    volume_token0
    /** @type {number} */
    token1_price
    /** @type {number} */
    volume_token1
    /** @type {number} */
    tvl
    /** @type {number} */
    mcap
    /** @type {Date} */
    created_at

    constructor(data) {
        this.id = data.id
        this.swap_id = data.swap_id
        this.pool_id = data.pool_id
        this.current_liquidity = data.current_liquidity
        this.current_price = data.current_price
        this.current_price_point_lg2 = data.current_price_point_lg2
        this.current_left_lg2 = data.current_left_lg2
        this.current_right_lg2 = data.current_right_lg2
        this.token0_price = data.token0_price
        this.volume_token0 = data.volume_token0
        this.token1_price = data.token1_price
        this.volume_token1 = data.volume_token1
        this.tvl = data.tvl
        this.mcap = data.mcap
        this.created_at = data.created_at
    }

    toObj() {
        return {
            id: this.id,
            swap_id: this.swap_id,
            pool_id: this.pool_id,
            current_liquidity: this.current_liquidity,
            current_price: this.current_price,
            current_price_point_lg2: this.current_price_point_lg2,
            current_left_lg2: this.current_left_lg2,
            current_right_lg2: this.current_right_lg2,
            token0_price: this.token0_price,
            volume_token0: this.volume_token0,
            token1_price: this.token1_price,
            volume_token1: this.volume_token1,
            tvl: this.tvl,
            mcap: this.mcap,
            created_at: this.created_at
        }
    }
}
