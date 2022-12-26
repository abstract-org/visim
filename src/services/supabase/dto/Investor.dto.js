import { Modules } from '@abstract-org/sdk'

export class InvestorDto {
    /** @type {number} */
    id
    /** @type {string} */
    name
    /** @type {string} */
    type
    /** @type {string} */
    hash
    /** @type {number} */
    initial_balance
    /** @type {Date} */
    created_at
    /** @type {Object[]} */
    investor_balances
    /** @type {Object[]} */
    investor_navs
    /** @type {{name:string}[]} */
    quests

    constructor(data) {
        this.id = data.id
        this.name = data.name
        this.type = data.type
        this.hash = data.hash
        this.initial_balance = data.initial_balance
        this.created_at = data.created_at
        this.investor_balances = data.investor_balances
        this.investor_navs = data.investor_navs
        this.quests = data.quests
    }

    toObj() {
        const balances = this.getLatestDayBalances().reduce(
            (resultObj, item) => {
                resultObj[item.quest.name] = item.balance

                return resultObj
            },
            {}
        )

        const questsCreated = this.quests.map((q) => q.name)

        return {
            id: this.id,
            name: this.name,
            type: this.type,
            hash: this.hash,
            initial_balance: this.initial_balance,
            created_at: this.created_at,
            balances,
            questsCreated
        }
    }

    toHash() {
        return this.hash
    }

    toInvestor() {
        const investor = new Modules.Investor()
        const data = this.toObj()
        investor.name = data.name
        investor.type = data.type
        investor.hash = data.hash
        investor.initialBalance = data.initial_balance
        investor.balances = data.balances
        investor.questsCreated = data.questsCreated

        return investor
    }

    getLatestDayBalances() {
        const allDays = this.investor_balances.map((balance) => balance.day)
        const latestDay = Math.max(...allDays)

        return this.investor_balances.filter(
            (invBalance) => invBalance.day === latestDay
        )
    }
}

export class InvestorUploadDto {
    /** @type {string} */
    name
    /** @type {string} */
    type
    /** @type {string} */
    hash
    /** @type {number} */
    initialBalance
    /** @type {Date} */
    created_at

    constructor(data) {
        this.name = data.name
        this.type = data.type
        this.hash = data.hash
        this.initial_balance = data.initialBalance
        this.created_at = data.created_at || new Date()
    }

    toObj() {
        return {
            name: this.name,
            type: this.type,
            hash: this.hash,
            initial_balance: this.initial_balance,
            created_at: this.created_at
        }
    }
}
