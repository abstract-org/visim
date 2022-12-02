export class SnapshotDataDto {
    /** @type {number} */
    id
    /** @type {number} */
    snapshot_id
    /** @type {string} */
    entity_type
    /** @type {number} */
    entity_id

    constructor(data) {
        this.id = data.id
        this.snapshot_id = data.snapshot_id
        this.entity_type = data.entity_type
        this.entity_id = data.entity_id
    }

    toObj() {
        return {
            id: this.id,
            snapshot_id: this.snapshot_id,
            entity_type: this.entity_type,
            entity_id: this.entity_id
        }
    }
}
