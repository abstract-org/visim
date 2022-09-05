import globalConfig from '../logic/config.global.json'
import { p2pp, pp2p } from '../logic/Utils/logicUtils'
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

it('cites a quest', () => {
    const priceMin = 1
    const priceMax = 10
    const { pool, investor, tokenLeft, tokenRight } = preparePool()
    const citedQuest = investor.createQuest('CITED')
    const crossPool = investor.createPool(citedQuest, tokenRight)

    investor.citeQuest(crossPool, priceMin, priceMax, 100, 0)

    tokenRight.addPool(crossPool)
    citedQuest.addPool(crossPool)

    expect(crossPool.name).toBe(`${citedQuest.name}-${tokenRight.name}`)
    expect(crossPool.pricePoints.get(p2pp(1)).liquidity).toBeCloseTo(146.247)
    expect(crossPool.pricePoints.get(p2pp(10)).liquidity).toBeCloseTo(-146.247)
})
