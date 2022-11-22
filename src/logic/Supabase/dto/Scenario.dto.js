export class ScenarioDto {
    /** @type {number} */
    id
    /** @type {string} */
    name
    /** @type {Date} */
    created_at

    constructor(data) {
        this.id = data.id
        this.name = data.name
        this.created_at = data.created_at
    }

    toObj() {
        return {
            id: this.id,
            name: this.name,
            created_at: this.created_at
        }
    }
}
