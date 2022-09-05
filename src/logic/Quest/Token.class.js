import HashMap from 'hashmap'

import Pool from '../Pool/Pool.class'

import globalConfig from '../config.global.json' // make it a hash map
import UsdcToken from './UsdcToken.class'

export default class Token {
    id // make uuid
    name
    pools = []
    positions = new HashMap()

    constructor(name) {
        this.name = name
    }

    createPool({
        tokenLeft = null,
        startingPrice = null,
        initialPositions = null
    } = {}) {
        if (tokenLeft === null) {
            tokenLeft = new UsdcToken()
        }

        const pool = new Pool(tokenLeft, this, startingPrice)

        this.addPool(pool)
        tokenLeft.addPool(pool)

        this.initializePoolPositions(pool, initialPositions)

        return pool
    }

    addPool(pool) {
        if (this.pools.find((exPool) => exPool.name === pool.name)) return

        this.pools.push(pool)
    }

    initializePoolPositions(pool, initialPositions) {
        const initial = initialPositions || globalConfig.INITIAL_LIQUIDITY
        initial.forEach((position) => {
            pool.openPosition(
                position.priceMin,
                position.priceMax,
                position.tokenA,
                position.tokenB
            )
        })

        this.positions.set(pool.name, pool.pricePoints.values())
    }

    pp2p(pricePoint) {
        return 2 ** pricePoint
    }

    p2pp(price) {
        return Math.log2(price)
    }

    // @TODO: Token can open positions during dampening (?)
}
