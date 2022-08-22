import Investor from '../logic/Investor/Investor.class'
import globalConfig from '../logic/config.global.json'
import { preparePool } from './helpers/poolManager'

it('Does micro price buy properly within the same liquidity', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool(20001)
    const [totalAmountIn, totalAmountOut] = pool.buy(0.000001)
    console.log(totalAmountIn, totalAmountOut)
    investor.addBalance(tokenLeft.name, totalAmountIn)
    investor.addBalance(tokenRight.name, totalAmountOut)

    expect(pool.currentLiquidity).toBeCloseTo(5050.505)
    expect(pool.totalSold).toBeCloseTo(0.000001)
    expect(pool.currentPrice).toBeCloseTo(1)
    expect(investor.balances[tokenLeft.name]).toBeCloseTo(0.999)
})

it('Does mini price buy properly within the same liquidity', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()
    const [totalAmountIn, totalAmountOut] = pool.buy(1)

    expect(pool.currentLiquidity).toBeCloseTo(5050.505)
    expect(pool.totalSold).toBeCloseTo(1)
    expect(pool.currentPrice).toBeCloseTo(1)
})

it('Does mini price buy properly while jumping liquidity', () => {
    const { pool, investor } = preparePool(100000)
    pool.buy(10920)

    expect(pool.currentLiquidity).toBeCloseTo(5050.505)
    expect(pool.totalSold).toBeCloseTo(3453.335)
    expect(pool.currentPrice).toBeCloseTo(9.999)

    pool.buy(1)
    expect(pool.currentLiquidity).toBeCloseTo(21378.221)
    expect(pool.currentPrice).toBeCloseTo(10)
})

it('Tries to buy over limit', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()
    pool.buy(12687741)
    const [totalIn, totalOut] = pool.buy(20000)

    expect(totalIn).toBe(0)
    expect(totalOut).toBe(0)
    expect(pool.currentLiquidity).toBe(0)
    expect(pool.totalSold).toBe(20000)
    expect(pool.currentPrice).toBeCloseTo(globalConfig.PRICE_MAX)
})

it('Does micro price sell properly within the same liquidity', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()
    pool.buy(2)
    const [totalAmountIn, totalAmountOut] = pool.sell(1)

    expect(pool.currentLiquidity).toBeCloseTo(5050.505)
    expect(pool.totalSold).toBeCloseTo(1)
    expect(pool.currentPrice).toBeCloseTo(1)
})

it('Does micro price sell properly while jumping liquidity', () => {
    const { pool, investor } = preparePool(100000)
    pool.buy(10920)
    expect(pool.currentPrice).toBeCloseTo(9.999)

    pool.buy(1)
    expect(pool.currentPrice).toBeCloseTo(10)

    expect(pool.currentLiquidity).toBeCloseTo(21378.221)
    expect(pool.totalSold).toBeCloseTo(3453.435)
    expect(pool.currentPrice).toBeCloseTo(10)

    pool.sell(1)
    expect(pool.currentLiquidity).toBeCloseTo(5050.505)
    expect(pool.totalSold).toBeCloseTo(3452.435)
    expect(pool.currentPrice).toBeCloseTo(9.987)
})

it('Tries to sell over limit', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()
    pool.buy(12687741)
    pool.sell(20000)
    pool.sell(10)

    expect(pool.currentLiquidity).toBeCloseTo(0)
    expect(pool.totalSold).toBeCloseTo(0)
    expect(pool.currentPrice).toBe(0)
})

it('swaps USDC for RP1 and updates current price', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()

    pool.buy(5000)
    expect(pool.currentPrice).toBeCloseTo(3.96)

    pool.buy(10000)
    expect(pool.currentPrice).toBeCloseTo(11.243)
})

it('Buys until runs out of USDC', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool(35001)

    let [totalAmountIn, totalAmountOut] = pool.buy(5000)

    investor.addBalance(tokenLeft.name, totalAmountIn)
    investor.addBalance(tokenRight.name, totalAmountOut)

    const leftBalance = investor.balances[tokenLeft.name]
    const rightBalance = investor.balances[tokenRight.name]

    expect(leftBalance).toBe(10001)
    expect(rightBalance).toBeCloseTo(2512.562)

    let [totalAmountIn2, totalAmountOut2] = pool.buy(5000)
    investor.addBalance(tokenLeft.name, totalAmountIn2)
    investor.addBalance(tokenRight.name, totalAmountOut2)

    expect(investor.balances[tokenLeft.name]).toBe(5001)
    expect(investor.balances[tokenRight.name]).toBeCloseTo(3355.7)

    let [totalAmountIn3, totalAmountOut3] = pool.buy(5000)
    investor.addBalance(tokenLeft.name, totalAmountIn3)
    investor.addBalance(tokenRight.name, totalAmountOut3)

    expect(investor.balances[tokenLeft.name]).toBeCloseTo(1)
})

it('Three investors buy, one during tick shift', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()
    const longTerm = new Investor(1, 1000000, 'long-term', true)
    const fomo = new Investor(1, 1000, 'fomo', true)

    let [totalAmountIn, totalAmountOut] = pool.buy(5000)
    investor.addBalance(tokenLeft.name, totalAmountIn)
    investor.addBalance(tokenRight.name, totalAmountOut)

    let [totalAmountIn2, totalAmountOut2] = pool.buy(5000)
    longTerm.addBalance(tokenLeft.name, totalAmountIn2)
    longTerm.addBalance(tokenRight.name, totalAmountOut2)

    let [totalAmountIn3, totalAmountOut3] = pool.buy(1000)
    fomo.addBalance(tokenLeft.name, totalAmountIn3)
    fomo.addBalance(tokenRight.name, totalAmountOut3)

    expect(fomo.balances[pool.tokenLeft.name]).toBe(0)
    expect(fomo.balances[pool.tokenRight.name]).toBeCloseTo(105.621)
})

it('Buy all the way to the right', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()

    pool.buy(1000000000000000)

    expect(pool.currentPrice).toBeLessThanOrEqual(globalConfig.PRICE_MAX)
    expect(pool.totalSold).toBe(20000)
    expect(pool.currentLiquidity).toBe(0)
})

it('Sell all the way to the left', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()

    pool.buy(100000000)
    expect(pool.totalSold).toBe(20000)
    pool.sell(20000)
    expect(pool.totalSold).toBeCloseTo(0)
})

it('Swaps RP1 for USDC and updates current price', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool(35000)

    let [totalAmountIn, totalAmountOut] = pool.buy(5000)
    investor.addBalance(tokenLeft.name, totalAmountIn)
    investor.addBalance(tokenRight.name, totalAmountOut)

    let [totalAmountIn2, totalAmountOut2] = pool.sell(2512.56)
    investor.addBalance(tokenLeft.name, totalAmountIn2)
    investor.addBalance(tokenRight.name, totalAmountOut2)

    expect(investor.balances[pool.tokenLeft.name]).toBeCloseTo(15000)
})

it('calculates initial liquidity', () => {
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

    expect(Math.round(pool.pricePoints.get(50).liquidity)).toBeCloseTo(38046)
})

it('has correct neighbors', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()

    const firstPosition = globalConfig.INITIAL_LIQUIDITY[0]
    expect(pool.pricePoints.get(firstPosition.priceMin).right).toBe(
        globalConfig.INITIAL_LIQUIDITY[1].priceMin
    )

    const lastPosition =
        globalConfig.INITIAL_LIQUIDITY[
            globalConfig.INITIAL_LIQUIDITY.length - 1
        ]
    expect(pool.pricePoints.get(lastPosition.priceMin).right).toBe(
        lastPosition.priceMax
    )
})

it('gets amount for liquidity', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()
    const firstPosition = globalConfig.INITIAL_LIQUIDITY[0]

    const liquidity = pool.pricePoints.get(firstPosition.priceMin).liquidity

    const [amount0, amount1] = pool.getAmountsForLiquidity(
        liquidity,
        Math.sqrt(firstPosition.priceMin),
        Math.sqrt(firstPosition.priceMax),
        Math.sqrt(firstPosition.priceMin)
    )

    expect(amount0).toBe(firstPosition.tokenLeftAmount)
})
