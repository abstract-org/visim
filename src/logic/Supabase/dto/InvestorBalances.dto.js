export class InvestorBalancesDto {
    /** @type {number} */
    investor_id
    /** @type {number} */
    quest_id
    /** @type {number} */
    balance
    /** @type {number} */
    day

    constructor(investorId, questId, balance, day = 0) {
        this.investor_id = investorId
        this.quest_id = questId
        this.balance = balance
        this.day = day
    }

    toObj() {
        return {
            investor_id: this.investor_id,
            quest_id: this.quest_id,
            balance: this.balance,
            day: this.day
        }
    }
}
