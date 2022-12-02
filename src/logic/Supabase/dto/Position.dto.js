import { convertFloat8ToNum, convertNumToFloat8 } from '../../Utils/logicUtils'

export class PositionDto {
    /** @type {number} */
    id
    /** @type {number} */
    pool_id
    /** @type {number} */
    liquidity
    /** @type {number} */
    left_point
    /** @type {number} */
    right_point
    /** @type {number} */
    price_point

    constructor(data) {
        this.id = data.id
        this.pool_id = data.pool_id
        this.liquidity = data.liquidity
        this.left_point = convertFloat8ToNum(data.left_point)
        this.right_point = convertFloat8ToNum(data.right_point)
        this.price_point = convertFloat8ToNum(data.price_point)
    }

    toObj() {
        return {
            liquidity: this.liquidity,
            left: this.left_point,
            right: this.right_point,
            pp: this.price_point
        }
    }
}

export class PositionUploadDto {
    /** @type {number} */
    pool_id
    /** @type {number} */
    liquidity
    /** @type {number} */
    left_point
    /** @type {number} */
    right_point
    /** @type {number} */
    price_point
    /** @type {Date} */
    created_at

    constructor(data, poolId) {
        this.pool_id = poolId
        this.liquidity = data.liquidity
        this.left_point = convertNumToFloat8(data.left)
        this.right_point = convertNumToFloat8(data.right)
        this.price_point = convertNumToFloat8(data.pp)
        this.created_at = data.created_at || new Date()
    }

    toObj() {
        return {
            pool_id: this.pool_id,
            liquidity: this.liquidity,
            left_point: this.left_point,
            right_point: this.right_point,
            price_point: this.price_point,
            created_at: this.created_at
        }
    }
}
