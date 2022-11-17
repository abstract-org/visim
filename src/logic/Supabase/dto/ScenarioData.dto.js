export class ScenarioDataDto {
    /** @type {number} */
    id
    /** @type {number} */
    scenario_id
    /** @type {string} */
    module_type
    /** @type {string} */
    key
    /** @type {string} */
    value

    constructor(data) {
        this.id = data.id
        this.scenario_id = data.scenario_id
        this.module_type = data.module_type
        this.key = data.key
        this.value = data.value
    }

    toObj() {
        return {
            id: this.id,
            scenario_id: this.scenario_id,
            module_type: this.module_type,
            key: this.key,
            value: this.value
        }
    }
}
