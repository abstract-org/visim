export class LogDto {
    /** @type {number} */
    id
    /** @type {number} */
    pool_id
    /** @type {number} */
    investor_id
    /** @type {number} */
    swap_id
    /** @type {string} */
    action
    /** @type {number} */
    day

    constructor(data) {
        this.id = data.id
        this.pool_id = data.pool_id
        this.investor_id = data.investor_id
        this.swap_id = data.swap_id
        this.action = data.action
        this.day = data.day
    }

    toObj() {
        return {
            id: this.id,
            pool_id: this.pool_id,
            investor_id: this.investor_id,
            swap_id: this.swap_id,
            action: this.action,
            day: this.day
        }
    }
}

export class LogUploadDto {
    /** @type {number} */
    pool_id
    /** @type {number} */
    investor_id
    /** @type {number} */
    swap_id
    /** @type {string} */
    action
    /** @type {number} */
    day

    constructor(data, poolMappings, investorMappings) {
        this.pool_id = poolMappings.get(data.pool)
        this.investor_id = investorMappings.get(data.investorHash)
        this.swap_id = data.swap_id
        this.action = data.action
        this.day = data.day
    }

    toObj() {
        return {
            pool_id: this.pool_id,
            investor_id: this.investor_id,
            swap_id: this.swap_id,
            action: this.action,
            day: this.day
        }
    }
}
