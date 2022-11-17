export class SnapshotDto {
    /** @type {number} */
    id
    /** @type {string} */
    seed
    /** @type {number} */
    scenario_id
    /** @type {Date} */
    created_at

    constructor(data) {
        this.id = data.id
        this.seed = data.seed
        this.scenario_id = data.scenario_id || null
        this.created_at = data.created_at
    }

    toObj() {
        return {
            id: this.id,
            seed: this.seed,
            scenario_id: this.scenario_id,
            created_at: this.created_at
        }
    }
}

export class SnapshotUploadDto {
    /** @type {string} */
    seed
    /** @type {number} */
    scenario_id
    /** @type {Date} */
    created_at

    constructor(data) {
        this.seed = data.seed
        this.scenario_id = data.scenarioId
        this.created_at = data.created_at || new Date()
    }

    toObj() {
        return {
            seed: this.seed,
            scenario_id: this.scenario_id
        }
    }
}
