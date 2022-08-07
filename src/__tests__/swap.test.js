import HashMap from 'hashmap';

import UsdcToken from "../logic/Token/UsdcToken.class";
import Investor from "../logic/Investor/Investor.class";

import globalConfig from '../logic/config.global.json';

// Our "global state" to coordinate 
const state = {
    investors: new HashMap(),
    tokens: new HashMap(),
    pools: new HashMap()
};
state.tokens.set('USDC', new UsdcToken());

fit('swaps USDC for RP1 and updates current price', () => {
    const investorCreator = new Investor(1, 10000, 'creator', true);
    const token1 = investorCreator.createToken('RP1');
    const pool = token1.createPool(state.tokens.get('USDC'));

    token1.addToPool(pool);
    token1.initializePoolPositions(pool);

    // TODO: Transfer all to "factory" utils with randomly generated names
    state.investors.set(investorCreator.name, investorCreator);
    state.pools.set(pool.name, pool);
    state.tokens.set(token1.name, token1);

    for(const position of pool.pricePoints) {
        // console.log(position.value);
    }
    // pool.swap(true, 50000)
});

it('calculates initial liquidity for token0', () => {
    const token0 = new Token('RP1', '0xBoris')
    const token1 = new Token('USDC', '0xUSDC')
    const pool = new Pool(token0, token1)

    const liquidity = pool.getLiquidityForAmounts(5000, 0, Math.sqrt(1), Math.sqrt(10000),pool.getCurrentPrice())
    expect(liquidity).toBeCloseTo(5050.50505050505)
    expect(pool.getLiquidity()).toBeCloseTo(5050.50505050505)
});

it('sets initial liquidity positions', () => {
    const token0 = new Token('RP1', '0xBoris')
    const token1 = new Token('USDC', '0xUSDC')
    const pool = new Pool(token0, token1)

    expect(pool.pricePoints.get(50).liquidity).toBeCloseTo(38045.566893796364)
});

it('has correct neighbors', () => {
    const token0 = new Token('RP1', '0xBoris')
    const token1 = new Token('USDC', '0xUSDC')
    const pool = new Pool(token0, token1)

    const firstPosition = globalConfig.INITIAL_LIQUIDITY[0];
    expect(pool.pricePoints.get(firstPosition.priceMin).right).toBe(globalConfig.INITIAL_LIQUIDITY[1].priceMin)

    const lastPosition = globalConfig.INITIAL_LIQUIDITY[globalConfig.INITIAL_LIQUIDITY.length-1];
    expect(pool.pricePoints.get(lastPosition.priceMin).right).toBe(lastPosition.priceMax)
});

it('gets amount for liquidity', () => {
    const token0 = new Token('RP1', '0xBoris')
    const token1 = new Token('USDC', '0xUSDC')
    const pool = new Pool(token0, token1)
    const firstPosition = globalConfig.INITIAL_LIQUIDITY[0]

    const liquidity = pool.pricePoints.get(firstPosition.priceMin).liquidity

    const [amount0, amount1] = pool.getAmountsForLiquidity(liquidity, Math.sqrt(firstPosition.priceMin), Math.sqrt(firstPosition.priceMax), Math.sqrt(firstPosition.priceMin));

    expect(amount0).toBe(firstPosition.token0Amount);
});