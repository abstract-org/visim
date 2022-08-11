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

it('swaps USDC for RP1 and updates current price', () => {
    const investorCreator = new Investor(1, 10000, 'creator', true)
    const token1 = investorCreator.createQuest('RP1')
    const pool = token1.createPool(state.tokens.get('USDC'))

    token1.addToPool(pool)
    token1.initializePoolPositions(pool)
    
    pool.buy(5000, investorCreator)
    expect(pool.currentPrice).toBeCloseTo(3.960)

    pool.buy(10000, investorCreator)
    expect(pool.currentPrice).toBeCloseTo(8.88)

    expect(investorCreator.balances[pool.tokenLeft.name]).toBe(0)
    expect(investorCreator.balances[pool.tokenRight.name]).toBeCloseTo(3355.7046)
});

it('Buys until runs out of USDC to zero', () => {
    const investorCreator = new Investor(1, 10000, 'creator', true)
    const token1 = investorCreator.createQuest('RP1')
    const pool = token1.createPool(state.tokens.get('USDC'))

    token1.addToPool(pool)
    token1.initializePoolPositions(pool)

    pool.buy(5000, investorCreator)
    expect(investorCreator.balances[pool.tokenLeft.name]).toBe(5000)
    expect(Math.round(investorCreator.balances[pool.tokenRight.name])).toBeCloseTo(2513)
    pool.buy(5000, investorCreator)
    expect(investorCreator.balances[pool.tokenLeft.name]).toBe(0)
    expect(Math.round(investorCreator.balances[pool.tokenRight.name])).toBeCloseTo(3356)
    pool.buy(5000, investorCreator)
    expect(investorCreator.balances[pool.tokenLeft.name]).toBe(0)
})

it('Three investors buy, one during tick shift', () => {
    const creator = new Investor(1, 10000, 'creator', true)
    const longTerm = new Investor(1, 1000000, 'long-term', true)
    const fomo = new Investor(1, 1000, 'fomo', true)

    const token1 = creator.createQuest('RP1')
    const pool = token1.createPool(state.tokens.get('USDC'))

    token1.addToPool(pool)
    token1.initializePoolPositions(pool)

    pool.buy(5000, creator)
    pool.buy(5000, longTerm)
    pool.buy(1000, fomo)
    expect(fomo.balances[pool.tokenLeft.name]).toBe(0)
    expect(fomo.balances[pool.tokenRight.name]).toBeCloseTo(105.621)
})

fit('Buy all the way to the right', () => {
    const creator = new Investor(1, 1000000000000000, 'creator', true)

    const token1 = creator.createQuest('RP1')
    const pool = token1.createPool(state.tokens.get('USDC'))

    token1.addToPool(pool)
    token1.initializePoolPositions(pool)

    pool.buy(1000000000000000, creator)

    expect(pool.currentPrice).toBeLessThanOrEqual(globalConfig.PRICE_MAX)
    expect(pool.totalSold).toBe(20000)
    expect(pool.currentLiquidity).toBe(0)
})

fit('Sell all the way to the left', () => {
    const creator = new Investor(1, 100000000, 'creator', true)

    const token1 = creator.createQuest('RP1')
    const pool = token1.createPool(state.tokens.get('USDC'))

    token1.addToPool(pool)
    token1.initializePoolPositions(pool)

    pool.buy(100000000, creator)

    console.log(creator)

    pool.sell(20000, creator)

    console.log(creator)

    expect(pool.currentPrice).toBeLessThanOrEqual(globalConfig.PRICE_MAX)
    //expect(pool.totalSold).toBe(20000)
    expect(pool.currentLiquidity).toBe(0)
})

it('Swaps RP1 for USDC and updates current price', () => {
    const creator = new Investor(1, 12000, 'creator', true)
    const longTerm = new Investor(1, 1000000, 'long-term', true)

    const token1 = creator.createQuest('RP1')
    const pool = token1.createPool(state.tokens.get('USDC'))

    token1.addToPool(pool)
    token1.initializePoolPositions(pool)
    pool.buy(5000, creator)
    console.log(pool)

    pool.sell(2512.56, creator)
    console.log(pool)
    console.log(creator)

    expect(creator.balances[pool.tokenLeft.name]).toBe(55555)
})

it('calculates initial liquidity for token0', () => {
    const investorCreator = new Investor(1, 10000, 'creator', true);
    const token1 = investorCreator.createQuest('RP1');
    const pool = token1.createPool(state.tokens.get('USDC'));

    token1.addToPool(pool);
    token1.initializePoolPositions(pool);

    const liquidity = pool.getLiquidityForAmounts(5000, 0, Math.sqrt(1), Math.sqrt(10000),pool.getCurrentPrice())
    expect(liquidity).toBeCloseTo(5050.50505050505)
    expect(pool.currentLiquidity).toBeCloseTo(5050.50505050505)
});

it('sets initial liquidity positions', () => {
    const investorCreator = new Investor(1, 10000, 'creator', true);
    const token1 = investorCreator.createQuest('RP1');
    const pool = token1.createPool(state.tokens.get('USDC'));

    token1.addToPool(pool);
    token1.initializePoolPositions(pool);


    expect(Math.round(pool.pricePoints.get(50).liquidity)).toBeCloseTo(38046)
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