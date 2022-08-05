import sha256 from 'crypto-js/sha256';
import globalConfig from '../config.global.json'; // make it a hash map
import HashMap from 'hashmap';

export default class Pool {
    token0;
    token1;
    currentPrice = globalConfig.PRICE_MIN;
    sqrtCurrentPrice = Math.sqrt(globalConfig.PRICE_MIN);
    currentTick = this.sqrtPriceToTick(Math.sqrt(globalConfig.PRICE_MIN));
    liquidity = 0;
    ticks = new HashMap();
    pricePoints = new HashMap();
    tickSpacing = globalConfig.TICK_SPACING;

    /*
    price = $1M/token -> 0.000001
        price_points =
            [PRICE_MIN]={liq=0,left=Num.neginf,right=1} //right=PRICE_MAX when pool first created, only PRICE_MIN and PRICE_MAX points exist 
            ["1"]={liq=5050,left=0,right=10}
            [10]={liq=16000,left=1,right=50}
            [50]={liq=50000,left=10,right=10000}
            [10000]={liq=-71050,left=50,right=PRICE_MAX}
            [PRICE_MAX]={liq=0,left=10000,right=Num.infinite}

            position change if someone adds 4000 liq from $2 to $1000
            *[1]={...,right=2,...}
            [2]={liq=4000,left=1,right=10}
            *[10]={...left=2...}
            
            *[50]={...,right=1000,...}
            [1000]={liq=-4000,left=50,right=10000}
            *[10000]={....,left=1000,...}

            if new price point was between cur_price and it's old left or right neighbor, update the prev/next and the old prev's next and old next's prev


        updatepos(p_lo,p_hi,liq,poolid?)
            price_point[p_lo].liq=liq
            price_point[p_hi].liq=-liq
            if pool[pool_id].cur_price in range [p_lo..p_hi]
                pool[pool_id].cur_liq+=liq
            
            //update prev/next
            if pool[pool_id].left > p_hi
               pool[pool_id].left = p_hi
            else if pool[pool_id].LEFT > P_LO -> LEFT=P_LO
            ... SAME WITH POOL.RIGHT

            THEN WHILE() LOOP STARTING WITH POOL.LEFT -> RIGHTWARDS TO FIND WHERE TO PUT THE NEW P_HI .. AND 
            SAME LOOP LEFTWARDS FROM POOL.RIGHT TO FIND WHERE TO PUT THE NEW P_LO AND UPDATE PREV/NEXT OF IT, AND PREV/NEXT TO THE LEFT AND RIGHT OF IT

            in liq math use sqrt in math
            */

    constructor(token0, token1) {
        if (token0.name === token1.name) throw 'Tokens should not match';

        this.token0 = token0;
        this.token1 = token1;
        this.hash = '0x'+sha256(`${token0} + ${token1}`);

        this.initialize();
    }

    initialize() {
        globalConfig.INITIAL_LIQUIDITY.forEach((liquidityItem, idx) => {
            this.addLiquidity(
                liquidityItem.priceMin,
                liquidityItem.priceMax,
                liquidityItem.token0Amount,
                liquidityItem.token1Amount
            )
        })
    }

    initialize2() {
        globalConfig.LIQUIDITY.forEach((liqItem, idx) => {
            let next = (globalConfig.LIQUIDITY[idx+1] !== 'undefined') ? globalConfig.LIQUIDITY[idx+1] : null
            let prev = (globalConfig.LIQUIDITY[idx-1] !== 'undefined') ? globalConfig.LIQUIDITY[idx-1] : null
            let currentTickIteration = this.defineTicksHashMap(liqItem[0], liqItem[1], prev, next);
            this.addLiquidity(currentTickIteration.tickLower, liqItem[2], liqItem[3]);
        })
    }

    defineTicksHashMap(priceMin, priceMax, prev, next) {
        // [1...10000] => [0...92100]
        const {tickLower, tickUpper} = this.getTicksByPriceRange(priceMin, priceMax);
        const prevTicks = prev ? this.getTicksByPriceRange(prev[0], prev[1]) : null;
        const nextTicks = next ? this.getTicksByPriceRange(next[0], next[1]) : null;

        this.ticks.set(tickLower, 
            {
                prev: prevTicks ? prevTicks.tickLower : null, 
                next: nextTicks ? nextTicks.tickLower : null, 
                tickLower, 
                tickUpper,
                liquidity: 0
            }
        );

        return this.ticks.get(tickLower);
    }

    // sqrt is x^1/2
    tickToSqrtPrice(tick) {    
        Math.sqrt(1.0001 ** tick); 
    }

    // ln(x^2)/ln(1.0001) = ln(x)*2/ln(1.0001) = ln(x) * 2 * 10000.5 = ln(x)*20001
    sqrtPriceToTick(sqrtPrice) {    
        return ~~(Math.log(sqrtPrice)*20001 / this.tickSpacing) * this.tickSpacing;
    }

    getTicksByPriceRange(priceMin, priceMax) {
        const tickLower = this.sqrtPriceToTick(Math.sqrt(priceMin))
        const tickUpper = this.sqrtPriceToTick(Math.sqrt(priceMax))

        return {tickLower, tickUpper}
    }

    addLiquidity(priceMin, priceMax, token0Amount, token1Amount) {

    }

    addLiquidity2(tickLower, token0Amount, token1Amount) {
        
        const currentTickIteration = this.ticks.get(tickLower);

        const liquidity = this.getLiquidityForAmounts(
            token0Amount,
            token1Amount,
            currentTickIteration.tickLower,
            currentTickIteration.tickUpper,
        );

        currentTickIteration.liquidity = liquidity;

        this.ticks.set(tickLower, currentTickIteration);
    }

    getLiquidityForAmounts(amount0, amount1, sqrtPriceMin, sqrtPriceMax, currentSqrtPrice) { 
        const liquidity0 = amount0 / (1 / sqrtPriceMin - 1 / sqrtPriceMax);
        const liquidity1 = amount1 / (currentSqrtPrice - sqrtPriceMin);

        if (currentSqrtPrice <= sqrtPriceMin) {
            return liquidity0;
        } else if (currentSqrtPrice < sqrtPriceMax) {
            return Math.min(liquidity0, liquidity1);
        }

        return liquidity1;
    }

    // changed parameters to ticks, not prices, added liq and curprice
    getAmountsForLiquidity(liquidity, tickMin, tickMax, curSqrtPrice) {
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
