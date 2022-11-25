export class PosOwnersDto {
    /** @type {number} */
    id
    /** @type {number} */
    owner_id
    /** @type {number} */
    position_id
    /** @type {number} */
    owner_type

    constructor(data) {
        this.id = data.id
        this.owner_id = data.owner_id
        this.position_id = data.position_id
        this.owner_type = data.owner_type
    }

    toObj() {
        return {
            id: this.id,
            owner_id: this.owner_id,
            position_id: this.position_id,
            owner_type: this.owner_type
        }
    }
}

export class PosOwnersUploadDto {
    constructor(posOwnerData, poolId) {
        this.pool_id = poolId
        this.amt0 = posOwnerData.amt0
        this.amt1 = posOwnerData.amt1
        this.hash = posOwnerData.hash
        this.native = posOwnerData.native
        this.pmax = posOwnerData.pmax
        this.pmin = posOwnerData.pmin
        this.type = posOwnerData.type
    }

    toObj() {
        return {
            pool_id: this.pool_id,
            amt0: this.amt0,
            amt1: this.amt1,
            hash: this.hash,
            native: this.native,
            pmax: this.pmax,
            pmin: this.pmin,
            type: this.type,
        }
    }
}
