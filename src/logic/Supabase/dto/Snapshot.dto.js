export class SnapshotDto {
    /** @type {number} */
    id
    /** @type {string} */
    seed
    /** @type {number} */
    scenario_id
    /** @type {string} */
    created_at

    constructor(data) {
        if (data.id) {
            this.id = data.id
        }
        this.seed = data.seed
        this.scenario_id = data.scenario_id || null
    }

    toObj() {
        return {
            id: this.id,
            seed: this.seed,
            scenario_id: this.scenario_id
        }
    }
}
