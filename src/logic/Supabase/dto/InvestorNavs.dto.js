export class InvestorNavsDto {
    /** @type {number} */
    id
    /** @type {number} */
    investor_id
    /** @type {number} */
    day
    /** @type {number} */
    usdc_nav
    /** @type {number} */
    token_nav
    /** @type {Date} */
    created_at

    constructor(data) {
        this.id = data.id
        this.investor_id = data.investor_id
        this.day = data.day
        this.usdc_nav = data.usdc_nav
        this.token_nav = data.token_nav
        this.created_at = data.created_at
    }

    toObj() {
        return {
            id: this.id,
            investor_id: this.investor_id,
            day: this.day,
            usdc_nav: this.usdc_nav,
            token_nav: this.token_nav,
            created_at: this.created_at
        }
    }
}
