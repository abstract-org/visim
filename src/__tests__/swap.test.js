import Pool from "../logic/Pool/Pool.class";
import Token from "../logic/Token/Token.class";

it('gets initial liquidity for token0', () => {
    const token0 = new Token('RP1', '0xBoris')
    const token1 = new Token('USDC', '0xUSDC')
    const pool = new Pool(token0, token1)

    const liquidity = pool.getLiquidityForAmounts(5000, 0, Math.sqrt(1), Math.sqrt(10000),pool.getCurrentPrice())
    expect(liquidity).toBeCloseTo(5050.50505050505)
});

it('generates correct ticks for price range', () => {
    const token0 = new Token('RP1', '0xBoris')
    const token1 = new Token('USDC', '0xUSDC')
    const pool = new Pool(token0, token1)

    const tick1 = pool.getTicksByPriceRange(1, 10000)
    const tick2 = pool.getTicksByPriceRange(10, 10000)
    const tick3 = pool.getTicksByPriceRange(50, 10000)
    const tick4 = pool.getTicksByPriceRange(200, 10000)

    expect(tick1.tickLower).toBe(0)
    expect(tick1.tickUpper).toBe(92100)
    expect(tick2.tickLower).toBe(23000)
    expect(tick2.tickUpper).toBe(92100)
    expect(tick3.tickLower).toBe(39100)
    expect(tick3.tickUpper).toBe(92100)
    expect(tick4.tickLower).toBe(52900)
    expect(tick4.tickUpper).toBe(92100)
})

it('initializes hashmap of ticks with initial liquidity', () => {
    const token0 = new Token('RP1', '0xBoris')
    const token1 = new Token('USDC', '0xUSDC')
    const pool = new Pool(token0, token1)
    const testKey = 39100

    if (pool.ticks.keys(testKey)) {
        const expected = {
            liquidity: 38045.566893796364,
            prev: 23000,
            next: 52900,
            tickLower: 39100,
            tickUpper: 92100,
            priceMin: 50,
            priceMax: 10000
        }

        expect(pool.ticks.get(testKey)).toEqual(expected)
    }
})