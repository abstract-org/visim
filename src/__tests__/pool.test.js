import HashMap from 'hashmap'

import Router from '../logic/Router/Router.class'
import { p2pp, pp2p } from '../logic/Utils/logicUtils'
import globalConfig from '../logic/config.global.json'
import { preparePool } from './helpers/poolManager'

let globalState = {
    pools: new HashMap(),
    investors: new HashMap(),
    quests: new HashMap()
}

beforeAll(() => {})

afterEach(() => {
    globalState = {
        pools: new HashMap(),
        investors: new HashMap(),
        quests: new HashMap()
    }
})

it('calculates initial liquidity for token0', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()

    const liquidity = pool.getLiquidityForAmounts(
        5000,
        0,
        Math.sqrt(1),
        Math.sqrt(10000),
        1
    )
    expect(liquidity).toBeCloseTo(5050.505)
})

it('sets initial liquidity positions', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()
    expect(Math.round(pool.pricePoints.get(p2pp(50)).liquidity)).toBeCloseTo(
        38046
    )
})

it('gets amount1 for liquidity', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()
    const firstPosition = globalConfig.INITIAL_LIQUIDITY[0]

    const liquidity = pool.pricePoints.get(p2pp(1)).liquidity

    const [amount0, amount1] = pool.getAmountsForLiquidity(
        liquidity,
        Math.sqrt(firstPosition.priceMin),
        Math.sqrt(firstPosition.priceMax),
        Math.sqrt(firstPosition.priceMin)
    )
    expect(amount0).toBe(firstPosition.tokenA)
})

/**
 * --- A luxury ---
    deposit A
    A: 1
    B: 2

    B[0.5...1]

    deposit B
    A: 1
    B: 2

    A[2...4]

    --- B luxury ---
    deposit A
    A: 2
    B: 1

    B[0.5...1]

    deposit B
    A: 2
    B: 1
    A[2...4]
 */

it('cites a quest with fresh pools', () => {
    const { pool, investor, tokenRight } = preparePool()
    const citedQuest = investor.createQuest('AGORA')
    const citedPool = citedQuest.createPool()
    const crossPool = investor.createPool(citedQuest, tokenRight)
    const priceRange = investor.calculatePriceRange(pool, citedPool, 2)
    investor.citeQuest(crossPool, priceRange.min, priceRange.max, 1000, 0)

    tokenRight.addPool(crossPool)
    citedQuest.addPool(crossPool)

    const swapInfo = crossPool.getSwapInfo()

    expect(crossPool.name).toBe(`${citedQuest.name}-${tokenRight.name}`)
    expect(swapInfo[0][0]).toBeCloseTo(-1414, 0)
    expect(swapInfo[0][1]).toBeCloseTo(1000)
    expect(
        crossPool.pricePoints.get(p2pp(priceRange.max)).liquidity
    ).toBeCloseTo(-3414, 0)
    expect(
        crossPool.pricePoints.get(p2pp(priceRange.min)).liquidity
    ).toBeCloseTo(3414, 0)
    expect(crossPool.pricePoints.get(p2pp(priceRange.min)).pp).toBeCloseTo(0)
    expect(crossPool.pricePoints.get(p2pp(priceRange.max)).pp).toBeCloseTo(1)
})

it('cites a quest with traded pool A', () => {
    const { pool, investor, tokenRight } = preparePool()
    const citedQuest = investor.createQuest('AGORA')
    const citedPool = citedQuest.createPool()
    const crossPool = investor.createPool(citedQuest, tokenRight)
    pool.buy(1000)

    const priceRange = investor.calculatePriceRange(pool, citedPool, 2)
    const [totalIn, totalOut] = investor.citeQuest(
        crossPool,
        priceRange.min,
        priceRange.max,
        1000,
        0
    )

    tokenRight.addPool(crossPool)
    citedQuest.addPool(crossPool)

    const swapInfo = crossPool.getSwapInfo()

    expect(crossPool.name).toBe(`${citedQuest.name}-${tokenRight.name}`)
    expect(swapInfo[0][0]).toBeCloseTo(-2030, 0)
    expect(swapInfo[0][1]).toBeCloseTo(1000)
    expect(
        crossPool.pricePoints.get(p2pp(priceRange.max)).liquidity
    ).toBeCloseTo(-4090, 0)
    expect(
        crossPool.pricePoints.get(p2pp(priceRange.min)).liquidity
    ).toBeCloseTo(4090, 0)
    expect(2 ** crossPool.pricePoints.get(p2pp(priceRange.min)).pp).toBeCloseTo(
        1.435204
    )
    expect(2 ** crossPool.pricePoints.get(p2pp(priceRange.max)).pp).toBeCloseTo(
        2.870408
    )
})

it('cites a quest with traded pool B', () => {
    const { pool, investor, tokenRight } = preparePool()
    const citedQuest = investor.createQuest('AGORA')
    const citedPool = citedQuest.createPool()
    const crossPool = investor.createPool(citedQuest, tokenRight)
    citedPool.buy(1000)

    const priceRange = investor.calculatePriceRange(pool, citedPool, 2)

    investor.citeQuest(crossPool, priceRange.min, priceRange.max, 100, 0)

    tokenRight.addPool(crossPool)
    citedQuest.addPool(crossPool)

    const swapInfo = crossPool.getSwapInfo()

    expect(crossPool.name).toBe(`${citedQuest.name}-${tokenRight.name}`)
    expect(swapInfo[0][0]).toBeCloseTo(-49, 0)
    expect(swapInfo[0][1]).toBeCloseTo(100)
    expect(
        crossPool.pricePoints.get(p2pp(priceRange.max)).liquidity
    ).toBeCloseTo(-202, 0)
    expect(
        crossPool.pricePoints.get(p2pp(priceRange.min)).liquidity
    ).toBeCloseTo(202, 0)
    expect(2 ** crossPool.pricePoints.get(p2pp(priceRange.min)).pp).toBeCloseTo(
        0.3483825295916121
    )
    expect(2 ** crossPool.pricePoints.get(p2pp(priceRange.max)).pp).toBeCloseTo(
        0.6967650591832242
    )
})
