import sha256 from 'crypto-js/sha256';
import globalConfig from '../config.global.json';
import HashMap from 'hashmap';

export default class Pool {
    token0;
    token1;
    currentPrice = globalConfig.PRICE_MIN;
    sqrtCurrentPrice = Math.sqrt(globalConfig.PRICE_MIN);
    currentTick = this.sqrtPriceToTick(Math.sqrt(globalConfig.PRICE_MIN));
    liquidity = 0;
    ticks = new HashMap();
    tickSpacing = globalConfig.TICK_SPACING;

    constructor(token0, token1) {
        if (token0.hash === token1.hash) throw 'Tokens should not match';

        this.token0 = token0;
        this.token1 = token1;
        this.hash = '0x'+sha256(`${token0} + ${token1}`);

        this.initialize();
    }

    initialize() {
        globalConfig.LIQUIDITY.forEach((liqItem, idx) => {
            let next = (globalConfig.LIQUIDITY[idx+1] !== 'undefined') ? globalConfig.LIQUIDITY[idx+1] : null
            let prev = (globalConfig.LIQUIDITY[idx-1] !== 'undefined') ? globalConfig.LIQUIDITY[idx-1] : null
            let currentTickIteration = this.defineTicksHashMap(liqItem[0], liqItem[1], prev, next);
            this.addLiquidity(currentTickIteration.tickLower, liqItem[2], liqItem[3]);
        })
    }

    defineTicksHashMap(priceMin, priceMax, prev, next) {
        const {tickLower, tickUpper} = this.getTicksByPriceRange(priceMin, priceMax);
        const prevTicks = prev ? this.getTicksByPriceRange(prev[0], prev[1]) : null;
        const nextTicks = next ? this.getTicksByPriceRange(next[0], next[1]) : null;

        this.ticks.set(tickLower, 
            {
                prev: prevTicks ? prevTicks.tickLower : null, 
                next: nextTicks ? nextTicks.tickLower : null, 
                tickLower, 
                tickUpper, 
                priceMin, 
                priceMax
            }
        );

        return this.ticks.get(tickLower);
    }

    tickToSqrtPrice(tick) {    // sqrt is x^1/2
        return Math.sqrt(1.0001 ** tick); 
    }

    squarePriceToTick(sqrtPrice) {
        return (~~((Math.log(sqrtPrice) * 20001)
                 / this.tickSpacing) * this.tickSpacing);
    }

    priceToSqrtPrice(price) {
        return Math.sqrt(price)
    }

    getTicksByPriceRange(priceMin, priceMax) {
        const sqrtPriceMin = this.priceToSqrtPrice(priceMin)
        const sqrtPriceMax = this.priceToSqrtPrice(priceMax)

        const tickLower = this.squarePriceToTick(sqrtPriceMin)
        const tickUpper = this.squarePriceToTick(sqrtPriceMax)

        return {tickLower, tickUpper}
    }

    addLiquidity(tickLower, token0Amount, token1Amount) {
        
        const currentTickIteration = this.ticks.get(tickLower);

        const liquidity = this.getLiquidityForAmounts(
            token0Amount,
            token1Amount,
            this.priceToSqrtPrice(currentTickIteration.priceMin),
            this.priceToSqrtPrice(currentTickIteration.priceMax)
        );

        currentTickIteration.liquidity = liquidity;

        this.ticks.set(tickLower, currentTickIteration);
    }

    getLiquidityForAmounts(amount0, amount1, sqrtPriceMin, sqrtPriceMax) {
        const liquidity0 = amount0 / (1 / sqrtPriceMin - 1 / sqrtPriceMax);
        const liquidity1 = amount1 / (this.sqrtCurrentPrice - sqrtPriceMin);

        if (this.sqrtCurrentPrice <= sqrtPriceMin) {
            return liquidity0;
        } else if (this.sqrtCurrentPrice < sqrtPriceMax) {
            return Math.min(liquidity0, liquidity1);
        }

        return liquidity1;
    }

    getAmountsForLiquidity(liquidity, tickMin, tickMax, curSqrtPrice) { // changed parameters to ticks, not prices, added liq and curprice
        sqrtPriceMax=tickToSqrtPrice(tickMax);
        sqrtPriceMin=tickToSqrtPrice(tickMin);
        clampedPrice = Math.max(Math.min(curSqrtPrice, sqrtPriceMax), sqrtPriceMin) // clamps cur to [min..max] range 
        const amountRight = liquidity * (1/clampedPrice - 1/sqrtPriceMax);
        const amountLeft  = liquidity * (clampedPrice - sqrtPriceMin);

        return [amountLeft, amountRight]; // one can be zero if current price outside the range
    }

    getLiquidity() {
        return this.liquidity;
    }

    getCurrentTick() {
        return this.currentTick;
    }

    getCurrentPrice() {
        return this.currentPrice;
    }

    calculateLowerPrice(amount1) {
        return (this.sqrtCurrentPrice - amount1 / this.liquidity) ** 2;
    }

    calculateUpperPrice(amount0) {
        return ((this.liquidity * this.sqrtCurrentPrice) / (this.liquidity - this.sqrtCurrentPrice * amount0)) ** 2;
    }

    swap(amountIn, amountOut) {

    }

    setTick(tick) {
        this.currentTick = tick;
    }

    setPrice(price) {
        this.currentPrice = price;
    }

    setSqrtPrice(sqrtPrice) {
        this.sqrtCurrentPrice = sqrtPrice;
    }

    setLiquidity(liquidity) {
        this.liquidity = liquidity;
    }
}
