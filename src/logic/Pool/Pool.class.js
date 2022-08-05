import sha256 from 'crypto-js/sha256';
import globalConfig from '../config.global.json';
import HashMap from 'hashmap';

export default class Pool {
    token0;
    token1;
    currentPrice = globalConfig.PRICE_MIN;
    sqrtCurrentPrice = Math.sqrt(globalConfig.PRICE_MIN);
    currentTick = this.squarePriceToTick(Math.sqrt(globalConfig.PRICE_MIN));
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

    squareTickToPrice(sqrtTick) {
        return Math.sqrt(Math.pow(1.0001, sqrtTick));
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