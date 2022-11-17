export class PositionDto {
    /** @type {number} */
    id
    /** @type {number} */
    pool_id
    /** @type {number} */
    owner_id
    /** @type {number} */
    left
    /** @type {number} */
    right
    /** @type {number} */
    price_point
    /** @type {Date} */
    created_at

    constructor(data) {
        this.id = data.id
        this.pool_id = data.pool_id
        this.owner_id = data.owner_id
        this.left = data.left
        this.right = data.right
        this.price_point = data.price_point
        this.created_at = data.created_at
    }

    toObj() {
        return {
            id: this.id,
            pool_id: this.pool_id,
            owner_id: this.owner_id,
            left: this.left,
            right: this.right,
            price_point: this.price_point,
            created_at: this.created_at
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
        this.left_point = data.left
        this.right_point = data.right
        this.price_point = data.pp
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
