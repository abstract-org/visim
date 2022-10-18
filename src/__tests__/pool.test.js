import { p2pp } from '../logic/Utils/logicUtils'
import globalConfig from '../logic/config.global.json'
import { prepareCrossPools, preparePool } from './helpers/poolManager'

describe('Liquidity Manager', () => {
    it('calculates liquidity for token0', () => {
        const { pool } = preparePool()

        const liquidity = pool.getLiquidityForAmounts(
            0,
            5000,
            Math.sqrt(1),
            Math.sqrt(10000),
            1
        )
        expect(liquidity).toBeCloseTo(5050.505)
    })

    it('calculates liquidity for token1', () => {
        const { pool } = preparePool()

        const liquidity = pool.getLiquidityForAmounts(
            5000,
            0,
            Math.sqrt(0.0001),
            Math.sqrt(0.0002),
            1
        )
        expect(liquidity).toBeCloseTo(5050.505)
    })

    it('sets initial liquidity positions', () => {
        const { pool } = preparePool()
        expect(Math.round(pool.pos.get(p2pp(50)).liquidity)).toBeCloseTo(38046)
    })

    it('gets amount0 for liquidity', () => {
        const { pool } = preparePool()
        const firstPosition = globalConfig.INITIAL_LIQUIDITY[0]

        const liquidity = pool.pos.get(p2pp(1)).liquidity

        const [amount0, _] = pool.getAmountsForLiquidity(
            liquidity,
            Math.sqrt(firstPosition.priceMin),
            Math.sqrt(firstPosition.priceMax),
            Math.sqrt(firstPosition.priceMin)
        )
        expect(amount0).toBe(firstPosition.tokenA)
    })

    it('gets amount1 for liquidity', () => {
        const { pool } = preparePool()
        const firstPosition = globalConfig.INITIAL_LIQUIDITY[0]

        const liquidity = pool.pos.get(p2pp(1)).liquidity

        const [_, amount1] = pool.getAmountsForLiquidity(
            liquidity,
            Math.sqrt(firstPosition.priceMin),
            Math.sqrt(firstPosition.priceMax),
            Math.sqrt(firstPosition.priceMin)
        )
        expect(amount1).toBe(firstPosition.tokenB)
    })
})

describe('getUSDCValue()', () => {
    it('returns 0 for non-USDC crosspool', () => {
        const [, { BA, AC }] = prepareCrossPools()

        expect(BA.getUSDCValue()).toBe(0)
        expect(AC.getUSDCValue()).toBe(0)
    })

    it('returns correct value of USDC in pool', () => {
        const [, { poolA }] = prepareCrossPools()

        poolA.buy(1000)
        poolA.buy(2000)
        poolA.buy(3000)

        expect(poolA.getUSDCValue()).toBeCloseTo(6000, 5)
    })
})

describe('isQuest()', () => {
    const initialPositions = [
        {
            priceMin: 1,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        },
        {
            priceMin: 20,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        },
        {
            priceMin: 50,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        },
        {
            priceMin: 200,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        }
    ]
    it('returns true for QUEST pool', () => {
        const { pool } = preparePool(10000, 'investor', initialPositions)

        expect(pool.tokenLeft).toBe('USDC')
        expect(pool.isQuest()).toBe(true)
    })

    it('returns true for USDC pool', () => {
        const { pool } = preparePool()

        expect(pool.isQuest()).toBe(true)
    })

    it('returns false for cross-pools', () => {
        const [, { BA }] = prepareCrossPools()

        expect(BA.isQuest()).toBe(false)
    })
})
