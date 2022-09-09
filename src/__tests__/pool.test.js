import { p2pp, pp2p } from '../logic/Utils/logicUtils'
import globalConfig from '../logic/config.global.json'
import { preparePool } from './helpers/poolManager'

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
    const crossPool = investor.createPool(citedQuest, tokenRight)

    const priceRange = investor.calculatePriceRange(pool, crossPool, 2)

    investor.citeQuest(crossPool, priceRange.min, priceRange.max, 100, 0)

    tokenRight.addPool(crossPool)
    citedQuest.addPool(crossPool)

    const swapInfo = crossPool.getSwapInfo()

    expect(crossPool.name).toBe(`${citedQuest.name}-${tokenRight.name}`)
    expect(swapInfo[0][0]).toBeCloseTo(-141.421)
    expect(swapInfo[0][1]).toBeCloseTo(100)
    expect(
        crossPool.pricePoints.get(p2pp(priceRange.max)).liquidity
    ).toBeCloseTo(-341.421)
    expect(
        crossPool.pricePoints.get(p2pp(priceRange.min)).liquidity
    ).toBeCloseTo(341.421)
})

fit('cites a quest with traded pool A', () => {
    const { pool, investor, tokenRight } = preparePool()
    const citedQuest = investor.createQuest('AGORA')
    const citedPool = citedQuest.createPool()
    const crossPool = investor.createPool(citedQuest, tokenRight)
    pool.buy(2092)

    const priceRange = investor.calculatePriceRange(pool, citedPool, 2)
    const [totalIn, totalOut] = investor.citeQuest(
        crossPool,
        priceRange.min,
        priceRange.max,
        100,
        0
    )

    tokenRight.addPool(crossPool)
    citedQuest.addPool(crossPool)

    const swapInfo = crossPool.getSwapInfo()

    expect(crossPool.name).toBe(`${citedQuest.name}-${tokenRight.name}`)
    expect(swapInfo[0][0]).toBeCloseTo(-70.71)
    expect(swapInfo[0][1]).toBeCloseTo(100)
    expect(
        crossPool.pricePoints.get(p2pp(priceRange.max)).liquidity
    ).toBeCloseTo(-241.42)
    expect(
        crossPool.pricePoints.get(p2pp(priceRange.min)).liquidity
    ).toBeCloseTo(241.42)
})

it('cites a quest with traded pool B', () => {
    const { pool, investor, tokenRight } = preparePool()
    const citedQuest = investor.createQuest('AGORA')
    const citedPool = citedQuest.createPool()
    const crossPool = investor.createPool(citedQuest, tokenRight)
    citedPool.buy(2092)

    const priceRange = investor.calculatePriceRange(pool, citedPool, 2)
    console.log(priceRange)

    investor.citeQuest(crossPool, priceRange.min, priceRange.max, 100, 0)

    tokenRight.addPool(crossPool)
    citedQuest.addPool(crossPool)

    const swapInfo = crossPool.getSwapInfo()

    expect(crossPool.name).toBe(`${citedQuest.name}-${tokenRight.name}`)
    expect(swapInfo[0][0]).toBeCloseTo(-282.843)
    expect(swapInfo[0][1]).toBeCloseTo(100)
    expect(
        crossPool.pricePoints.get(p2pp(priceRange.max)).liquidity
    ).toBeCloseTo(-482.843)
    expect(
        crossPool.pricePoints.get(p2pp(priceRange.min)).liquidity
    ).toBeCloseTo(482.843)
})
