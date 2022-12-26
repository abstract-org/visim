import { Modules } from '@abstract-org/sdk'

import { convertArrayToHashMapByKey } from '../../../utils/serializer'
import { PoolDataDto } from './PoolData.dto'
import { PosOwnersDto } from './PosOwners.dto'
import { PositionDto } from './Position.dto'

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
    /** @type {PoolDataDto} */
    pool_data

    constructor(data) {
        this.id = data.id
        this.name = data.name
        this.token0 = data.left.name
        this.token1 = data.right.name
        this.type = data.type
        this.hash = data.hash
        this.created_at = data.created_at
        this.pool_data = new PoolDataDto(data.pool_data[0])
        this.pos = data.position.map((posItem) => new PositionDto(posItem))
        this.posOwners = data.position_owner.map(
            (posOwner) => new PosOwnersDto(posOwner)
        )
    }

    toPool(pos = {}) {
        const pool = new Modules.Pool()

        pool.name = this.name
        pool.tokenLeft = this.token0
        pool.tokenRight = this.token1
        pool.type = this.type

        const poolData = this.pool_data.toObj()
        pool.priceToken0 = poolData.token0_price
        pool.priceToken1 = poolData.token1_price
        pool.curLeft = poolData.current_left_lg2
        pool.curRight = poolData.current_right_lg2
        pool.curPrice = poolData.current_price
        pool.curPP = poolData.current_price_point_lg2
        pool.curLiq = poolData.current_liquidity
        pool.volumeToken0 = poolData.volume_token0
        pool.volumeToken1 = poolData.volume_token1
        pool.type = pool.tokenLeft === 'USDC' ? 'QUEST' : 'VALUE_LINK'
        pool.totalSold = poolData.total_sold
        pool.FRESH = poolData.is_fresh
        pool.soldToken0 = poolData.sold_token0
        pool.soldToken1 = poolData.sold_token1

        pool.posOwners = this.posOwners.map((posOwner) => posOwner.toObj())
        const positions = this.pos.map((position) => position.toObj())
        pool.pos = convertArrayToHashMapByKey(positions, 'pp')
        return pool
    }

    toName() {
        return this.name
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

    constructor(data, questNameToQuestId) {
        this.name = data.name
        this.token0 = questNameToQuestId.get(data.tokenLeft)
        this.token1 = questNameToQuestId.get(data.tokenRight)
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
