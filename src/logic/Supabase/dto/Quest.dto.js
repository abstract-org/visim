import Token from '../../Quest/Token.class'
import UsdcToken from '../../Quest/UsdcToken.class'

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
    /** @type {Boolean} */
    is_human

    constructor(data) {
        this.id = data.id
        this.author_id = data.author_id
        this.name = data.name
        this.hash = data.hash
        this.created_at = data.created_at
        this.is_human = data.is_human
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

    toName() {
        return this.name
    }

    toQuest() {
        const quest = this.name === 'USDC' ? new UsdcToken() : new Token()
        if (this.name !== 'USDC') quest.hash = this.hash
        quest.name = this.name
        // quest.id = this.id

        return quest
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
        this.is_human = data.isHuman
    }

    toObj() {
        return {
            author_id: this.author_id,
            name: this.name,
            hash: this.hash,
            is_human: this.is_human
        }
    }
}
