import sha256 from 'crypto-js/sha256';
import globalConfig from '../config.global.json';

export default class Pool {
    token0;
    token1;
    currentPrice = globalConfig.PRICE_MIN;
    sqrtCurrentPrice = Math.sqrt(globalConfig.PRICE_MIN);
    currentTick = this.squarePriceToTick(Math.sqrt(globalConfig.PRICE_MIN));
    liquidity = 0;
    ticks = new Array(((globalConfig.TICK_MAX * 2) / globalConfig.TICK_SPACING) + 1).fill(0);
    tickSpacing = globalConfig.TICK_SPACING;

    constructor(token0, token1) {
        if (token0.hash === token1.hash) throw 'Tokens should not match';

        this.token0 = token0;
        this.token1 = token1;
        this.hash = '0x'+sha256(`${token0} + ${token1}`);
    }

    squareTickToPrice(sqrtTick) {
        return Math.sqrt(Math.pow(1.0001, sqrtTick));
    }

    squarePriceToTick(sqrtPrice) {
        return (Math.floor((
                Math.log(sqrtPrice ** 2) / Math.log(1.0001))
                 / this.tickSpacing) * this.tickSpacing);
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

    getAmountsForLiquidity(sqrtPriceMin, sqrtPriceMax) {
        const sqrtPrice0 = Math.max(Math.min(this.sqrtCurrentPrice, sqrtPriceMax), sqrtPriceMin);
        const sqrtPrice1 = Math.max(Math.min(this.sqrtCurrentPrice, sqrtPriceMin), sqrtPriceMax);
        const amount0 = this.liquidity * (1 / sqrtPrice0) - (1 / sqrtPriceMax);
        const amount1 = this.liquidity * (sqrtPrice1 - sqrtPriceMin);

        if (this.sqrtCurrentPrice <= sqrtPriceMin) {
            return [amount0];
        } else if (this.sqrtCurrentPrice < sqrtPriceMax) {
            return [amount0, amount1];
        }

        return [amount1];
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