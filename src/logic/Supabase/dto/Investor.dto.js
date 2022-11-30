import Investor from '../../Investor/Investor.class'

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
    /** @type {Object[]} */
    investor_balances
    /** @type {{name:string}[]} */
    quests

    constructor(data) {
        this.id = data.id
        this.name = data.name
        this.type = data.type
        this.hash = data.hash
        this.created_at = data.created_at
        this.investor_balances = data.investor_balances
        this.quests = data.quests
    }

    toObj() {
        const balances = this.investor_balances.reduce((resultObj, item) => {
            resultObj[item.quest.name] = item.balance

            return resultObj
        }, {})

        const questsCreated = this.quests.map((q) => q.name)

        return {
            id: this.id,
            name: this.name,
            type: this.type,
            hash: this.hash,
            created_at: this.created_at,
            balances,
            questsCreated
        }
    }

    toHash() {
        return this.hash
    }

    toInvestor() {
        const investor = new Investor()
        const data = this.toObj()
        investor.name = data.name
        investor.type = data.type
        investor.hash = data.hash
        investor.balances = data.balances
        investor.questsCreated = data.questsCreated

        return investor
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
        this.created_at = data.created_at || new Date()
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
