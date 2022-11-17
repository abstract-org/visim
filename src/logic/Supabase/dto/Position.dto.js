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
