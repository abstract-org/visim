export class InvestorBalancesDto {
    /** @type {number} */
    id
    /** @type {number} */
    investor_id
    /** @type {number} */
    quest_id
    /** @type {number} */
    balance
    /** @type {number} */
    day

    constructor(data) {
        this.id = data.id
        this.investor_id = data.investor_id
        this.quest_id = data.quest_id
        this.balance = data.balance
        this.day = data.day
    }

    toObj() {
        return {
            id: this.id,
            investor_id: this.investor_id,
            quest_id: this.quest_id,
            balance: this.balance,
            day: this.day
        }
    }
}
