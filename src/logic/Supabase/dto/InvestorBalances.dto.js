export class InvestorBalancesDto {
    /** @type {number} */
    investor_id
    /** @type {number} */
    quest_id
    /** @type {number} */
    balance
    /** @type {number} */
    day

    constructor(investor, questName, balance, day = 0, investorHashToInvestorId, questNameToQuestId) {
        this.investor_id = investorHashToInvestorId.get(investor.hash)
        this.quest_id = questNameToQuestId.get(questName)
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
