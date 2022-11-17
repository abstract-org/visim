export class InvestorDto {
    /** @type {number} */
    id
    /** @type {string} */
    name
    /** @type {string} */
    type
    /** @type {string} */
    hash
    /** @type {Date} */
    created_at

    constructor(data) {
        this.id = data.id
        this.name = data.name
        this.type = data.type
        this.hash = data.hash
        this.created_at = data.created_at
    }

    toObj() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            hash: this.hash,
            created_at: this.created_at
        }
    }
}

export class InvestorUploadDto {
    /** @type {string} */
    name
    /** @type {string} */
    type
    /** @type {string} */
    hash
    /** @type {Date} */
    created_at

    constructor(data) {
        this.name = data.name
        this.type = data.type
        this.hash = data.hash
        this.created_at = data.created_at
    }

    toObj() {
        return {
            name: this.name,
            type: this.type,
            hash: this.hash,
            created_at: this.created_at
        }
    }
}
