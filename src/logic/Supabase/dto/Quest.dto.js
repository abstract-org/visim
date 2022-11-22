export class QuestDto {
    /** @type {number} */
    id
    /** @type {number} */
    author_id
    /** @type {string} */
    name
    /** @type {string} */
    hash
    /** @type {Date} */
    created_at

    constructor(data) {
        this.id = data.id
        this.author_id = data.author_id
        this.name = data.name
        this.hash = data.hash
        this.created_at = data.created_at
    }

    toObj() {
        return {
            id: this.id,
            author_id: this.author_id,
            name: this.name,
            hash: this.hash,
            created_at: this.created_at
        }
    }
}

export class QuestUploadDto {
    /** @type {number} */
    author_id
    /** @type {string} */
    name
    /** @type {string} */
    hash

    constructor(data, investorMappings) {
        this.author_id = investorMappings.get(data.name) // returns investor_id
        this.name = data.name
        this.hash = data.hash || '0x0000'
    }

    toObj() {
        return {
            author_id: this.author_id,
            name: this.name,
            hash: this.hash,
        }
    }
}
