import Pool from "../logic/Pool/Pool.class";
import Token from "../logic/Token/Token.class";
import globalConfig from '../logic/config.global.json';

it('gets initial liquidity for token0', () => {
    const token0 = new Token('RP1', '0xBoris')
    const token1 = new Token('USDC', '0xUSDC')
    const pool = new Pool(token0, token1)

    const liquidity = pool.getLiquidityForAmounts(5000, 0, Math.sqrt(1), Math.sqrt(10000))
    expect(liquidity).toBeCloseTo(5050.50505050505)
});

it('gets prices for liquidity', () => {
    const token0 = new Token('RP1', '0xBoris')
    const token1 = new Token('USDC', '0xUSDC')
    const pool = new Pool(token0, token1)
    pool.sqrtCurrentPrice = 27.280563107429096
    pool.liquidity = 21355.70786984449

    console.log(pool.getAmountsForLiquidity(Math.sqrt(1), Math.sqrt(10000)))

})