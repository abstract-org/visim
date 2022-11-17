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
    /** @type {number} */
    id
    /** @type {number} */
    owner_id
    /** @type {number} */
    position_id
    /** @type {number} */
    owner_type

    constructor(positionId, owner) {
        this.position_id = positionId
        this.owner_id = owner.id
        this.owner_type = owner.type
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
