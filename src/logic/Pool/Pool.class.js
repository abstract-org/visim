import sha256 from 'crypto-js/sha256';
import globalConfig from '../config.global.json';

export default class Pool {
    token0;
    token1;
    currentPrice = globalConfig.PRICE_MIN;
    sqrtCurrentPrice = Math.sqrt(globalConfig.PRICE_MIN);
    currentTick = this.sqrtPriceToTick(Math.sqrt(globalConfig.PRICE_MIN));
    liquidity = 0;
    ticks = new Array(((globalConfig.TICK_MAX * 2) / globalConfig.TICK_SPACING) + 1).fill(0);
            // empty: ticks[i]=0
            // liquid: ticks[i]={liq:50000,nextLiqTick=90100,prevLiqTick:80900}
    tickSpacing = globalConfig.TICK_SPACING;

    constructor(token0, token1) {
        if (token0.hash === token1.hash) throw 'Tokens should not match';

        this.token0 = token0;
        this.token1 = token1;
        this.hash = '0x'+sha256(`${token0} + ${token1}`);
    }

    tickToSqrtPrice(tick) {    // sqrt is x^1/2
        return Math.sqrt(1.0001 ** tick); 
    }

    sqrtPriceToTick(sqrtPrice) {    // ln(x^2)/ln(1.0001) = ln(x)*2/ln(1.0001) = ln(x) * 2 * 10000.5 = ln(x)*20001
        return ~~(Math.log(sqrtPrice)*20001 / this.tickSpacing) * this.tickSpacing;
    }

    getLiquidityForAmounts(amount0, amount1, sqrtPriceMin, sqrtPriceMax, curSqrtPrice) { 
                // local curSqrtPrice so can do dry runs regardless of current pool price
                // TODO: floor prices to nearest tick, or take ticks as parameters and calc price2tick outside (preferred)
        
        //clamp price to [min..max] range
        clampedPrice = Math.max(Math.min(curSqrtPrice, sqrtPriceMax), sqrtPriceMin)
        
        return Math.min(   // min(num,inf)=num, should work
                amount1 / (clampedPrice - sqrtPriceMin),  
                amount0 / (1/clampedPrice - 1/sqrtPriceMax)
        );
    }

    getAmountsForLiquidity(liquidity, tickMin, tickMax, curSqrtPrice) { // changed parameters to ticks, not prices, added liq and curprice
        sqrtPriceMax=tickToSqrtPrice(tickMax);
        sqrtPriceMin=tickToSqrtPrice(tickMin);
        clampedPrice = Math.max(Math.min(curSqrtPrice, sqrtPriceMax), sqrtPriceMin) // clamps cur to [min..max] range 
        const amountRight = liquidity * (1/clampedPrice - 1/sqrtPriceMax);
        const amountLeft  = liquidity * (clampedPrice - sqrtPriceMin);

        return [amountLeft, amountRight]; // one can be zero if current price outside the range
    }

    setTick(tick) {
        this.currentTick = tick;
    }

    setPrice(price) {
        this.currentPrice = price;
        this.sqrtCurrentPrice = Math.sqrt(this.currentPrice)
    }

    setSqrtPrice(sqrtPrice) {
        this.sqrtCurrentPrice = sqrtPrice;
        this.currentPrice = this.sqrtCurrentPrice ** 2;
    }

    setLiquidity(liquidity) {
        this.liquidity = liquidity;
    }
}
