import HashMap from 'hashmap'

import Pool from '../Pool/Pool.class'
import globalConfig from '../config.global.json'
// make it a hash map
import UsdcToken from './UsdcToken.class'

export default class Token {
    id // make uuid
    name
    pools = []
    positions = new HashMap()

    constructor(...args) {
        if (args > 0) {
            throw new Error('Please instantiate Token via Token.create(name)')
        }
    }

    /**
     * @description Instantiates new Token with name
     * @param {string} name
     * @returns {Token}
     */
    static create(name) {
        const thisToken = new Token()
        thisToken.name = name

        return thisToken
    }

    createPool({
        tokenLeft = null,
        startingPrice = null,
        initialPositions = null,
        totalTokensProvisioned = null
    } = {}) {
        const tokenLeftInstance = tokenLeft || new UsdcToken()
        const pool = Pool.create(tokenLeftInstance, this, startingPrice)

        this.addPool(pool)
        tokenLeftInstance.addPool(pool)

        this.initializePoolPositions(pool, initialPositions)

        return pool
    }

    /**
     * @param {Object} pool
     */
    addPool(pool) {
        if (
            this.pools.find(
                (existingPoolName) => existingPoolName === pool.name
            )
        )
            return

        this.pools.push(pool.name)
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

    // @TODO: Token can open positions during dampening (?)
}
