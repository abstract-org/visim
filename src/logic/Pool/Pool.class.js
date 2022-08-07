import sha256 from 'crypto-js/sha256';
import globalConfig from '../config.global.json'; // make it a hash map
import HashMap from 'hashmap';

export default class Pool {
    name;

    tokenLeft;
    tokenRight;

    currentLeft = -Infinity;
    currentRight = Infinity;
    currentPrice = globalConfig.PRICE_MIN;
    currentPricePoint = 0;
    currentLiquidity = 0;

    pricePoints = new HashMap();

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
            */

    constructor(tokenLeft, tokenRight, startingPrice) {
        if (tokenLeft.name === tokenRight.name) throw 'Tokens should not match';

        this.tokenLeft = tokenLeft;
        this.tokenRight = tokenRight;

        this.name = '0x'+sha256(tokenLeft+tokenRight);

        if (startingPrice > 0) {
            this.setPrice(startingPrice);
        }

        this.initializePoolBoundaries();
    }

    initializePoolBoundaries() {
        // Define default price boundaries 
        this.pricePoints.set(globalConfig.PRICE_MIN, {
            liquidity: 0,
            left: -Infinity,
            right: globalConfig.PRICE_MAX
        });

        this.pricePoints.set(globalConfig.PRICE_MAX, {
            liquidity: 0,
            left: globalConfig.PRICE_MIN,
            right: Infinity
        });

        this.currentPricePoint = globalConfig.PRICE_MIN;
        this.currentLeft = -Infinity;
        this.currentRight = Infinity
    }

    setPositionSingle(price, liquidity) {
        this.pricePoints.forEach((position, point) => {
            if (point < price && price < position.right && liquidity > 0) {
                let newPosition = {
                    liquidity,
                    left: point,
                    right: position.right
                };

                this.pricePoints.set(price, newPosition);

                if (this.pricePoints.get(position.right) !== Infinity) {
                    const next = this.pricePoints.get(position.right);
                    next.left = price;
                    this.pricePoints.set(position.right, next);
                }

                position.right = price;
                this.pricePoints.set(point, position);
            } else if (point > price && position.left <= price && liquidity < 0) {
                let newPosition = {};

                if (this.pricePoints.has(price)) {
                    newPosition = this.pricePoints.get(price);
                    newPosition.liquidity += liquidity;
                } else {
                    newPosition = {
                        liquidity,
                        left: position.left,
                        right: point
                    };

                    const next = this.pricePoints.get(point);
                    const prev = this.pricePoints.get(next.left);

                    prev.right = price;
                    this.pricePoints.set(next.left, prev);

                    next.left = price;
                    this.pricePoints.set(point, next);
                }

                this.pricePoints.set(price, newPosition);
            }
        });
    }

    setPosition(priceMin, priceMax, liquidity) {
        const nearestLeft = this.findNearest('left', priceMin);
        const nearestRight = this.findNearest('right', priceMax);

        if (
            this.currentPricePoint < priceMin && 
            this.currentPricePoint < priceMax &&
            this.currentLeft < priceMin &&
            this.currentRight > priceMax
            ) {
                this.pricePoints.set(priceMin, {
                    liquidity,
                    left: nearestLeft,
                    right: priceMax
                });

                this.pricePoints.set(priceMax, {
                    liquidity: -liquidity,
                    left: priceMin,
                    right: nearestRight
                });

                return [this.pricePoints.get(priceMin), this.pricePoints.get(priceMax)];
        }

        if (this.currentPricePoint >= priceMin && this.currentPricePoint <= priceMax) {
            this.setLiquidity(this.activeLiquidity += liquidity)
        }

        return;

        if (this.currentPrice >= priceMin && this.currentPrice <= priceMax) {
            this.setLiquidity(this.activeLiquidity += liquidity)
            // TBD: Is it the right way? change to caching left and right
            this.currentPricePoint = priceMin;
        }

        /*
            if new price point was between cur_price and it's old left/right neighbor, 
            update the:
            - prev/next
            - old prev's next
            - old next's prev

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
        */
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

    getAmountsForLiquidity(liquidity, sqrtPriceMin, sqrtPriceMax, curSqrtPrice) {
        const clampedPrice = Math.max(Math.min(curSqrtPrice, sqrtPriceMax), sqrtPriceMin);
        // TBD: Are we sure of the order? amountLeft === amount0, e.g 5000 TK?
        const amountLeft = liquidity * (1/clampedPrice - 1/sqrtPriceMax);
        const amountRight  = liquidity * (clampedPrice - sqrtPriceMin);

        return [amountLeft, amountRight]; // one can be zero if current price outside the range
    }

    swap(goingRight, amount, sqrtPriceLimit = 0) {
        let currentLiquidity = this.getLiquidity();
        let currentPrice = this.getCurrentPrice();
        let sqrtCurrentPrice = this.getSqrtCurrentPrice();
        let currentLeft = this.pricePoints.get(this.currentPricePoint).left;
        let currentRight = this.pricePoints.get(this.currentPricePoint).right;
        let isPositionMaxed = false;
        let amountRemaining = amount;

        // TBD: PRICE_MAX is highest in position with liquidity or beyond?
        // TODO: How to implement the actual limit?
        sqrtPriceLimit = goingRight ? globalConfig.PRICE_MAX : globalConfig.PRICE_MIN; 

        let nextPrice = goingRight ? currentRight : currentLeft;
        let nextSqrtPrice = Math.sqrt(nextPrice);

        // Each iteration is a position in this.pricePoints
        while(amountRemaining > 0 && sqrtCurrentPrice != sqrtPriceLimit) {
            // TODO: Implement limit here
            // if there's an actual tick available next, it will be "below" the MAX/MIN limit, so keep the limit
            // if there is no more tick with liquidity, then "next_price"=MAX/MIN limit, so it will be equal to LIMIT
            
            let amount0UntilNextPrice = currentLiquidity * (nextSqrtPrice - sqrtCurrentPrice);
            let amount1UntilNextPrice = currentLiquidity * (1 / sqrtCurrentPrice - 1 / nextSqrtPrice);

            // console.log(currentRight, nextSqrtPrice, amount0UntilNextPrice, amount1UntilNextPrice);

            let amountIn = goingRight ? Math.floor(amount0UntilNextPrice) : Math.ceil(amount1UntilNextPrice);;
            let amountOut = 0;
            let arrivedAtSqrtPrice = 0;

            if (goingRight) {
                arrivedAtSqrtPrice = sqrtCurrentPrice + amountRemaining / currentLiquidity;
            } else {
                arrivedAtSqrtPrice = currentLiquidity / (currentLiquidity / sqrtCurrentPrice + amountRemaining);
            }

            // If we arrived at the next sqrt price or higher, cap at next sqrt price or leave as is
            arrivedAtSqrtPrice = arrivedAtSqrtPrice > nextSqrtPrice ? nextSqrtPrice : arrivedAtSqrtPrice;

            // Guaranteed arrived at the next sqrt price
            isPositionMaxed = arrivedAtSqrtPrice === nextSqrtPrice;

            /*
            // TBD: JUNK?
            if (goingRight) {
                amountIn = (isPositionMaxed && (amount > 0)) ? amountIn : (-1) * amount1UntilNextPrice;
                amountOut = (isPositionMaxed && (amount <= 0)) ? amountOut : (-1) * amount0UntilNextPrice;
            } else {
                amountIn = (isPositionMaxed && (amount > 0)) ? amountIn : amount0UntilNextPrice;
                amountOut = (isPositionMaxed && (amount <= 0)) ? amountOut : amount1UntilNextPrice;
            }*/

            // TBD: Possibly above code is required for proper amount deduction
            amountRemaining += goingRight ? -amount1UntilNextPrice : amount0UntilNextPrice;

            sqrtCurrentPrice = arrivedAtSqrtPrice;

            let nextPriceLiquidity = this.pricePoints.get(currentRight).liquidity;

            if (isPositionMaxed) {
                // TBD: Reached the end - exit. Should be at the beginning of the loop?
                if (
                        (!goingRight && this.pricePoints.get(currentLeft).left <= -Infinity) || 
                        (goingRight && this.pricePoints.get(currentRight).right >= Infinity)
                 ) {
                    break;
                }

                currentLiquidity += this.goingRight ? nextPriceLiquidity : (-1 * nextPriceLiquidity);
                currentLeft = this.pricePoints.get(nextPrice).left;
                currentRight = this.pricePoints.get(nextPrice).right;
                currentPrice = goingRight ? nextPrice : currentLeft;
                sqrtCurrentPrice = Math.sqrt(nextPrice);
            } else {
                currentPrice = arrivedAtSqrtPrice;
            }

            this.setLiquidity(currentLiquidity);
            this.setPrice(currentPrice);
        }
    }

    getLiquidity() {
        return this.activeLiquidity;
    }

    getCurrentPrice() {
        return this.currentPrice;
    }

    getSqrtCurrentPrice() {
        return this.sqrtCurrentPrice;
    }

    calculateLowerPrice(amount1) {
        return (this.sqrtCurrentPrice - amount1 / this.activeLiquidity) ** 2;
    }

    calculateUpperPrice(amount0) {
        return ((this.activeLiquidity * this.sqrtCurrentPrice) / (this.activeLiquidity - this.sqrtCurrentPrice * amount0)) ** 2;
    }

    setPrice(price) {
        this.currentPrice = price;
        this.sqrtCurrentPrice = Math.sqrt(price);
    }

    setSqrtPrice(sqrtPrice) {
        this.sqrtCurrentPrice = sqrtPrice;
        this.currentPrice = sqrtPrice ** 2;
    }

    setLiquidity(liquidity) {
        this.activeLiquidity = liquidity;
    }
}
