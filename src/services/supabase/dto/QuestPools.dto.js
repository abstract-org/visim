export class QuestPoolsDto {
    /** @type {number} */
    id
    /** @type {number} */
    quest_id
    /** @type {number} */
    pool_id

    constructor(data) {
        this.id = data.id
        this.quest_id = data.quest_id
        this.pool_id = data.pool_id
    }

    toObj() {
        return {
            id: this.id,
            quest_id: this.quest_id,
            pool_id: this.pool_id
        }
    }
}
