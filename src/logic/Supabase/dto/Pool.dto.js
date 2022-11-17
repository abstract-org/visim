import Pool from '../../Pool/Pool.class'
import convertObjToHashMap from '../../Utils/serializer'

export class PoolDto {
    /** @type {number} */
    id
    /** @type {string} */
    name
    /** @type {string} */
    token0
    /** @type {string} */
    token1
    /** @type {string} */
    type
    /** @type {string} */
    hash
    /** @type {Date} */
    created_at

    constructor(data) {
        this.id = data.id
        this.name = data.name
        this.token0 = data.token0
        this.token1 = data.token1
        this.type = data.type
        this.hash = data.hash
        this.created_at = data.created_at
    }

    toPool(pos = {}, posOwners = [], poolData = {}) {
        const pool = new Pool()

        pool.name = this.name
        pool.tokenLeft = this.token0
        pool.tokenRight = this.token1
        pool.type = this.type

        pool.pos = convertObjToHashMap(pos)
        pool.posOwners = [...posOwners]

        pool.priceToken0 = poolData.priceToken0
        pool.priceToken1 = poolData.priceToken1
        pool.FRESH = poolData.FRESH
        pool.curLeft = poolData.curLeft
        pool.curRight = poolData.curRight
        pool.curPrice = poolData.curPrice
        pool.curPP = poolData.curPP
        pool.curLiq = poolData.curLiq
        pool.totalSold = poolData.totalSold
        pool.volumeToken0 = poolData.volumeToken0
        pool.volumeToken1 = poolData.volumeToken1
        pool.soldToken0 = poolData.soldToken0
        pool.soldToken1 = poolData.soldToken1

        return pool
    }
}

export class PoolUploadDto {
    /** @type {string} */
    name
    /** @type {string} */
    token0
    /** @type {string} */
    token1
    /** @type {string} */
    type
    /** @type {string} */
    hash
    /** @type {Date} */
    created_at

    constructor(data) {
        this.name = data.name
        this.token0 = data.tokenLeft
        this.token1 = data.tokenRight
        this.type = data.type
        this.hash = data.hash || 'hash'
        this.created_at = data.created_at || new Date()
    }

    toObj() {
        return {
            name: this.name,
            type: this.type,
            token0: this.token0,
            token1: this.token1,
            hash: this.hash,
            created_at: this.created_at
        }
    }
}
