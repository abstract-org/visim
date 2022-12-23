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
    /** @type {number} */
    investor_id

    constructor(data) {
        this.id = data.id
        this.amt0 = data.amt0
        this.amt1 = data.amt1
        this.hash = data.hash
        this.native = data.native
        this.pmax = data.pmax
        this.pmin = data.pmin
        this.type = data.type
        this.investor_id = data.investor_id
    }

    toObj() {
        return {
            amt0: this.amt0,
            amt1: this.amt1,
            hash: this.hash,
            native: this.native,
            pmax: this.pmax,
            pmin: this.pmin,
            type: this.type,
            investor_id: this.investor_id
        }
    }
}

export class PosOwnersUploadDto {
    constructor(posOwnerData, poolId, investorId) {
        this.pool_id = poolId
        this.amt0 = posOwnerData.amt0
        this.amt1 = posOwnerData.amt1
        this.hash = posOwnerData.hash
        this.native = posOwnerData.native
        this.pmax = posOwnerData.pmax
        this.pmin = posOwnerData.pmin
        this.type = posOwnerData.type
        this.investor_id = investorId
    }

    toObj() {
        return {
            pool_id: this.pool_id,
            investor_id: this.investor_id,
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
