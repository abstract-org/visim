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
        if (!(tokenLeft instanceof UsdcToken)) {
            tokenLeft.addPool(pool)
        }

        this.initializePoolPositions(pool, initialPositions)

        return pool
    }

    addPool(pool) {
        if (this.pools.find((exPool) => exPool.name === pool.name)) return

        this.pools.push(pool)
    }

    initializePoolPositions(pool, initialPositions) {
        const initial = initialPositions || globalConfig.INITIAL_LIQUIDITY
        const liquidityForLeft = []

        initial.forEach((position) => {
            let liquidity = pool.getLiquidityForAmounts(
                position.tokenLeftAmount,
                position.tokenRightAmount,
                Math.sqrt(position.priceMin),
                Math.sqrt(position.priceMax),
                Math.sqrt(pool.currentPrice)
            )

            pool.setPositionSingle(position.priceMin, liquidity)
            liquidityForLeft.push({ priceMax: position.priceMax, liquidity })
        })

        liquidityForLeft.forEach((liqItem) => {
            pool.setPositionSingle(liqItem.priceMax, -liqItem.liquidity)
        })

        this.positions.set(pool.name, pool.pricePoints.values())
    }

    // @TODO: Token can open positions during dampening (?)
}
