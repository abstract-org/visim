import { LogicUtils } from '@abstract-org/sdk'

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
    /** @type {boolean} */
    is_fresh
    /** @type {number} */
    total_sold
    /** @type {number} */
    sold_token0
    /** @type {number} */
    sold_token1

    constructor(data) {
        this.id = data.id
        this.swap_id = data.swap_id
        this.pool_id = data.pool_id
        this.current_liquidity = data.current_liquidity
        this.current_price = LogicUtils.convertFloat8ToNum(data.current_price)
        this.current_price_point_lg2 = LogicUtils.convertFloat8ToNum(
            data.current_price_point_lg2
        )
        this.current_left_lg2 = LogicUtils.convertFloat8ToNum(
            data.current_left_lg2
        )
        this.current_right_lg2 = LogicUtils.convertFloat8ToNum(
            data.current_right_lg2
        )
        this.token0_price = data.token0_price
        this.volume_token0 = data.volume_token0
        this.token1_price = data.token1_price
        this.volume_token1 = data.volume_token1
        this.tvl = data.tvl
        this.mcap = data.mcap
        this.created_at = data.created_at
        this.is_fresh = data.is_fresh
        this.total_sold = data.total_sold
        this.sold_token0 = data.sold_token0
        this.sold_token1 = data.sold_token1
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
            created_at: this.created_at,
            is_fresh: this.is_fresh,
            total_sold: this.total_sold,
            sold_token0: this.sold_token0,
            sold_token1: this.sold_token1
        }
    }
}

export class PoolDataUploadDto {
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
    /** @type {boolean} */
    is_fresh
    /** @type {number} */
    total_sold
    /** @type {number} */
    sold_token0
    /** @type {number} */
    sold_token1

    constructor(data, poolMappings) {
        this.pool_id = poolMappings.get(data.name)
        this.current_liquidity = data.curLiq
        this.current_price = LogicUtils.convertNumToFloat8(data.curPrice)
        this.current_price_point_lg2 = LogicUtils.convertNumToFloat8(data.curPP)
        this.current_left_lg2 = LogicUtils.convertNumToFloat8(data.curLeft)
        this.current_right_lg2 = LogicUtils.convertNumToFloat8(data.curRight)
        this.token0_price = data.priceToken0
        this.token1_price = data.priceToken1
        this.volume_token0 = data.volumeToken0
        this.volume_token1 = data.volumeToken1
        this.tvl = data.tvl || 0
        this.mcap = data.mcap || 0
        this.created_at = data.created_at || new Date()
        this.is_fresh = data.FRESH
        this.total_sold = data.totalSold
        this.sold_token0 = data.soldToken0
        this.sold_token1 = data.soldToken1
    }

    toObj() {
        return {
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
            created_at: this.created_at,
            is_fresh: this.is_fresh,
            total_sold: this.total_sold,
            sold_token0: this.sold_token0,
            sold_token1: this.sold_token1
        }
    }
}
