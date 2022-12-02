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
    /** @type {string[]} */
    pools
    /** @type {number} */
    initial_balance_a
    /** @type {number} */
    initial_balance_b

    constructor(data, pools) {
        this.id = data.id
        this.author_id = data.author_id
        this.name = data.name
        this.hash = data.hash
        this.created_at = data.created_at
        this.is_human = data.is_human
        this.initial_balance_a = data.initial_balance_a
        this.initial_balance_b = data.initial_balance_b
        this.pools = pools
    }

    toObj() {
        return {
            id: this.id,
            author_id: this.author_id,
            name: this.name,
            hash: this.hash,
            is_human: this.is_human,
            initial_balance_a: this.data.initial_balance_a,
            initial_balance_b: this.data.initial_balance_b,
            pools: this.pools,
            created_at: this.created_at
        }
    }

    toName() {
        return this.name
    }

    get isUSDC() {
        return this.name === 'USDC'
    }

    toQuest() {
        const quest = this.isUSDC ? new UsdcToken() : new Token()
        quest.name = this.name
        quest.pools = this.pools
        if (!this.isUSDC) {
            quest.id = this.id
            quest.hash = this.hash
            // @TODO: tbd which of this fields should come DB
            quest.initialBalanceA = this.initial_balance_a
            quest.initialBalanceB = this.initial_balance_b
            // quest.positions = this.positions
        }

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
    /** @type {number} */
    initial_balance_a
    /** @type {number} */
    initial_balance_b

    constructor(data, investorMappings) {
        this.name = data.name
        // fields below should fallback to DB defaults for USDC token
        this.author_id = investorMappings.get(data.name) // returns investor_id or null
        this.hash = data.hash || '0x0000'
        this.is_human = !!data.isHuman
        this.initial_balance_a = data.initialBalanceA || 0
        this.initial_balance_b = data.initialBalanceB || 0
    }

    toObj() {
        return {
            author_id: this.author_id,
            name: this.name,
            hash: this.hash,
            is_human: this.is_human,
            initial_balance_a: this.initial_balance_a,
            initial_balance_b: this.initial_balance_b
        }
    }
}
