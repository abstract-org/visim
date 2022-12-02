export class PosOwnersDto {
    /** @type {number} */
    id
    /** @type {number} */
    amt0
    /** @type {number} */
    amt1
    /** @type {string} */
    hash
    /** @type {boolean} */
    native
    /** @type {number} */
    pmax
    /** @type {number} */
    pmin
    /** @type {string} */
    type

    constructor(data) {
        this.id = data.id
        this.amt0 = data.amt0
        this.amt1 = data.amt1
        this.hash = data.hash
        this.native = data.type !== 'investor'
        this.pmax = data.pmax
        this.pmin = data.pmin
        this.type = data.type
    }

    toObj() {
        return {
            amt0: this.amt0,
            amt1: this.amt1,
            hash: this.hash,
            native: this.native,
            pmax: this.pmax,
            pmin: this.pmin,
            type: this.type
        }
    }
}

export class PosOwnersUploadDto {
    constructor(posOwnerData, poolId) {
        this.pool_id = poolId
        this.amt0 = posOwnerData.amt0
        this.amt1 = posOwnerData.amt1
        this.hash = posOwnerData.hash
        this.native = posOwnerData.type !== 'investor'
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
            type: this.type
        }
    }
}
