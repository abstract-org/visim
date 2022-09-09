import Investor from '../logic/Investor/Investor.class'
import { p2pp, pp2p } from '../logic/Utils/logicUtils'
import globalConfig from '../logic/config.global.json'
import { preparePool } from './helpers/poolManager'

it('Does micro price buy properly within the same liquidity', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool(20001)
    const [totalAmountIn, totalAmountOut] = pool.buy(0.000001)
    investor.addBalance(tokenLeft.name, totalAmountIn)
    investor.addBalance(tokenRight.name, totalAmountOut)

    expect(pool.currentLiquidity).toBeCloseTo(5050.505)
    expect(pool.totalSold).toBeCloseTo(0.000001)
    expect(pool.currentPrice).toBeCloseTo(1)
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
    pool.buy(150000000)
    const [totalIn, totalOut] = pool.buy(20000)

    expect(totalIn).toBe(0)
    expect(totalOut).toBe(0)
    expect(pool.currentLiquidity).toBe(0)
    expect(pool.totalSold).toBe(20000)
    expect(pool.currentPrice).toBeCloseTo(999999.999)
})

it('Does micro price sell properly within the same liquidity', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()
    pool.buy(2)
    const [totalAmountIn, totalAmountOut] = pool.sell(1)

    // console.log(pool, totalAmountIn, totalAmountOut)
    expect(pool.currentLiquidity).toBeCloseTo(5050.505)
    expect(pool.totalSold).toBeCloseTo(1)
    expect(pool.currentPrice).toBeCloseTo(1)
    expect(totalAmountIn).toBeCloseTo(-1)
    expect(totalAmountOut).toBeCloseTo(1)
})

it('Dry buy all', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()

    const [aBuy, aSell] = pool.getSwapInfo()
    expect(aBuy[0]).toBeCloseTo(-12687740.547)
    expect(aBuy[1]).toBeCloseTo(20000)
})

it('Dry sell all', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()

    pool.buy(10000000000)
    const [aBuy, aSell] = pool.getSwapInfo()
    expect(aSell[0]).toBeCloseTo(-20000)
    expect(aSell[1]).toBeCloseTo(12687740.547)
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
    const [a1in, a1out] = pool.buy(1000000000)
    expect(pool.totalSold).toBeCloseTo(20000)

    expect(a1in).toBeCloseTo(-12687740.547)
    expect(a1out).toBeCloseTo(20000)

    const [a1_1in, a1_1out] = pool.buy(30)
    expect(a1_1in).toBe(0)
    expect(a1_1out).toBe(0)

    const [a2in, a2out] = pool.sell(30000)
    expect(a2out).toBeCloseTo(12687740.547)
    expect(a2in).toBeCloseTo(-20000)

    const [a3in, a3out] = pool.sell(10)
    expect(a3out).toBe(0)
    expect(a3in).toBe(0)
    expect(pool.currentRight).toBe(0)

    const [a4in, a4out] = pool.buy(300)
    expect(a4in).toBeCloseTo(-300)
    expect(a4out).toBeCloseTo(283.179)

    const [a5in, a5out] = pool.buy(1000000000)
    expect(a5in).toBeCloseTo(-12687440.547)
    expect(a5out).toBeCloseTo(20000 - a4out)

    const [a6in, a6out] = pool.buy(10)
    expect(a6in).toBe(0)
    expect(a6out).toBe(0)

    const [a7in, a7out] = pool.sell(20000)
    expect(a7out).toBeCloseTo(12687740.547)
    expect(a7in).toBeCloseTo(-20000)

    const [a8in, a8out] = pool.sell(20)
    expect(a8in).toBe(0)
    expect(a8out).toBe(0)

    const [a9in, a9out] = pool.buy(1000000000)
    expect(a9in).toBeCloseTo(-12687740.547)
    expect(a9out).toBeCloseTo(20000)

    const [a10in, a10out] = pool.buy(10)
    expect(a10in).toBe(0)
    expect(a10out).toBe(0)

    const [a11in, a11out] = pool.sell(20000)
    expect(a11out).toBeCloseTo(12687740.547)
    expect(a11in).toBeCloseTo(-20000)

    const [a12in, a12out] = pool.sell(20)
    expect(a12in).toBe(0)
    expect(a12out).toBe(0)

    const [a13in, a13out] = pool.buy(12687739)
    expect(a13in).toBeCloseTo(-12687739)
    expect(a13out).toBeCloseTo(19999.999)

    const [a14in, a14out] = pool.sell(19999)
    expect(a14in).toBeCloseTo(-19999)
    expect(a14out).toBeCloseTo(12687737.999)

    expect(pool.currentLiquidity).toBeCloseTo(5050.505)
    expect(pool.totalSold).toBeCloseTo(0.999)
    expect(pool.currentPrice).toBeCloseTo(1.0)
})

it('swaps USDC for RP1 and updates current price', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()

    pool.buy(5000)
    expect(pool.currentPrice).toBeCloseTo(3.96)

    pool.buy(10000)
    expect(pool.currentPrice).toBeCloseTo(11.243)
})

it('Buys until runs out of USDC', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool(20001)

    let [totalAmountIn, totalAmountOut] = pool.buy(5000)

    investor.addBalance(tokenLeft.name, totalAmountIn)
    investor.addBalance(tokenRight.name, totalAmountOut)

    const leftBalance = investor.balances[tokenLeft.name]
    const rightBalance = investor.balances[tokenRight.name]

    expect(leftBalance).toBe(15001)
    expect(rightBalance).toBe(2513)

    let [totalAmountIn2, totalAmountOut2] = pool.buy(5000)
    investor.addBalance(tokenLeft.name, totalAmountIn2)
    investor.addBalance(tokenRight.name, totalAmountOut2)

    expect(investor.balances[tokenLeft.name]).toBe(10001)
    expect(investor.balances[tokenRight.name]).toBe(3356)

    let [totalAmountIn3, totalAmountOut3] = pool.buy(5000)
    investor.addBalance(tokenLeft.name, totalAmountIn3)
    investor.addBalance(tokenRight.name, totalAmountOut3)

    expect(investor.balances[tokenLeft.name]).toBeCloseTo(5001)
})

it('Three investors one tick (buy during liquidity shift)', () => {
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
    expect(fomo.balances[pool.tokenRight.name]).toBe(106)
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
    const { pool, investor, tokenLeft, tokenRight } = preparePool(10000)

    let [totalAmountIn, totalAmountOut] = pool.buy(5000)
    investor.addBalance(tokenLeft.name, totalAmountIn)
    investor.addBalance(tokenRight.name, totalAmountOut)

    expect(pool.currentPrice).toBeCloseTo(3.9601)

    let [totalAmountIn2, totalAmountOut2] = pool.sell(2513)
    investor.addBalance(tokenLeft.name, totalAmountOut2)
    investor.addBalance(tokenRight.name, totalAmountIn2)

    expect(investor.balances[pool.tokenLeft.name]).toBe(10000)
    expect(pool.currentPrice).toBe(1)
})

it('buys with a price limit up to X within the same liquidity', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()

    let [totalAmountIn, totalAmountOut] = pool.buy(10000, 5)
    expect(totalAmountIn).toBeCloseTo(-6242.767)
    expect(totalAmountOut).toBeCloseTo(2791.85)
    expect(pool.currentPrice).toBeCloseTo(5)
})

it('buys with a price limit up to X by jumping through liquidity', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()

    let [totalAmountIn, totalAmountOut] = pool.buy(20000, 11)
    expect(totalAmountIn).toBeCloseTo(-14220.261)
    expect(totalAmountOut).toBeCloseTo(3768.006)
    expect(pool.currentPrice).toBeCloseTo(11)
})

it('sells with a price limit down to X', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()

    pool.buy(50000)
    expect(pool.totalSold).toBeCloseTo(5929.808)

    let [totalAmountIn, totalAmountOut] = pool.sell(5000, 11)
    expect(totalAmountOut).toBeCloseTo(35779.738)
    expect(totalAmountIn).toBeCloseTo(-2161.802)
    expect(pool.currentPrice).toBeCloseTo(11)
})

it('sells with a price limit down to X by jumping through liquidity', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()

    pool.buy(50000)
    expect(pool.totalSold).toBeCloseTo(5929.808)

    let [totalAmountIn, totalAmountOut] = pool.sell(5500, 5)
    expect(totalAmountOut).toBeCloseTo(43757.232)
    expect(totalAmountIn).toBeCloseTo(-3137.958)
    expect(pool.currentPrice).toBeCloseTo(5)
})

it('Calculates reserves properly by swapping in different directions in both USDC and cross pools', () => {
    const investor = new Investor(1, 500000, 'creator')
    const quest = investor.createQuest('AGORA')
    const quest2 = investor.createQuest('AGORA2')
    const quest3 = investor.createQuest('AGORA3')
    const quest4 = investor.createQuest('AGORA4')

    const pool = quest.createPool()
    const pool2 = quest2.createPool()
    const pool3 = quest3.createPool()
    const pool4 = quest4.createPool()

    pool.getSwapInfo()
    pool.buy(10000000000000)
    const swap1 = pool.getSwapInfo()

    pool2.sell(10000000000000)
    const swap2 = pool2.getSwapInfo()

    pool3.buy(6000000)
    const swap3 = pool3.getSwapInfo()

    pool4.sell(6000000)
    const swap4 = pool4.getSwapInfo()

    const AB = investor.createPool(quest2, quest)
    investor.citeQuest(AB, 1, 2, 1000, 0)
    const swap5 = AB.getSwapInfo()

    const AC = investor.createPool(quest3, quest)
    investor.citeQuest(AC, 1, 2, 1000, 0)
    const swap6 = AC.getSwapInfo()

    const AD = investor.createPool(quest4, quest)
    investor.citeQuest(AD, 1, 2, 1000, 1000)
    const swap7 = AD.getSwapInfo()

    expect(Math.abs(swap1[1][0])).toBe(20000)
    expect(Math.abs(swap1[1][1])).toBeCloseTo(12687740.547)

    expect(Math.abs(swap2[0][0])).toBeCloseTo(12687740.547)
    expect(Math.abs(swap2[0][1])).toBe(20000)

    expect(Math.abs(swap3[0][0])).toBeCloseTo(6687740.547)
    expect(Math.abs(swap3[0][1])).toBeCloseTo(1265.881)
    expect(Math.abs(swap3[1][0])).toBeCloseTo(18734.118)
    expect(Math.abs(swap3[1][1])).toBe(6000000)

    expect(Math.abs(swap4[0][1])).toBe(20000)
    expect(Math.abs(swap4[0][0])).toBeCloseTo(12687740.547)

    expect(Math.abs(swap5[0][0])).toBeCloseTo(1414.213)
    expect(Math.abs(swap5[0][1])).toBe(1000)

    expect(Math.abs(swap6[0][1])).toBe(1000)
    expect(Math.abs(swap6[0][0])).toBeCloseTo(1414.213)

    expect(Math.abs(swap7[0][0])).toBeCloseTo(1414.213)
    expect(Math.abs(swap7[0][1])).toBeCloseTo(1000)
})
