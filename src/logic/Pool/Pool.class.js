import sha256 from 'crypto-js/sha256';
import globalConfig from '../config.global.json'; // make it a hash map
import HashMap from 'hashmap';
import BigNumber from 'bignumber.js';

export default class Pool {
    name;

    tokenLeft;
    tokenRight;

    currentLeft = -Infinity;
    currentRight = Infinity;
    currentPrice = globalConfig.PRICE_MIN;
    currentPricePoint = globalConfig.PRICE_MIN;
    currentLiquidity = 0;

    totalSold = 0;

    pricePoints = new HashMap();

    constructor(tokenLeft, tokenRight, startingPrice) {
        if (tokenLeft.name === tokenRight.name) throw 'Tokens should not match';

        this.tokenLeft = tokenLeft;
        this.tokenRight = tokenRight;

        this.name = '0x'+sha256(tokenLeft.name+tokenRight.name);

        if (startingPrice) {
            this.currentPrice = startingPrice;
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
            // setting priceMin liquidity positions
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

            // setting priceMax liquidity positions
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

            if (price > this.currentLeft && price < this.currentPricePoint) {
                this.currentLeft = price;
            }
            
            if (price > this.currentPricePoint && price < this.currentRight) {
                this.currentRight = price;
            }
        });
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

    buy(amount, investor) {
        if (!investor) {
            console.error('You are trying to swap without providing reference to investor');
            return;
        }

        let nextPricePoint
        let currentLiquidity
        let arrivedAtSqrtPrice = Math.sqrt(this.currentPrice);
        
        let journal = [];
        let i = 0;

        // while have stuff to sell, and not out of bounds and arrived at next price point to calculate next chunk of swap
        do {
            journal[i] = [];

            nextPricePoint = this.currentRight;
            currentLiquidity = this.currentLiquidity;
            arrivedAtSqrtPrice += amount / currentLiquidity;
            
            journal[i].push(`Current price: ${this.currentPrice}`);
            journal[i].push(`Current left/right: ${this.currentLeft}/${this.currentRight}`);
            journal[i].push(`Next price point: ${nextPricePoint}`);
            journal[i].push(`Current liquidity: ${currentLiquidity}`);
            journal[i].push(`New arrived b4 cap at ${i}: ${arrivedAtSqrtPrice}`);

            if (arrivedAtSqrtPrice >= Math.sqrt(nextPricePoint)) {
                arrivedAtSqrtPrice = Math.sqrt(nextPricePoint);
                journal[i].push(`Arrived price is higher/equal than nextPricePoint, capping at ${arrivedAtSqrtPrice}`);
                this.currentLiquidity += this.pricePoints.get(nextPricePoint).liquidity * 1;
                this.currentRight = this.pricePoints.get(nextPricePoint).right;
                this.currentLeft = this.pricePoints.get(nextPricePoint).left;
                this.currentPricePoint = nextPricePoint;
                journal[i].push(`Next liquidity: ${this.currentLiquidity}`);
                journal[i].push(`Next left/right: ${this.currentLeft}/${this.currentRight}`);
                journal[i].push(`WILL MOVE TO NEXT POSITION: ${nextPricePoint}`);
            }

            journal[i].push(`Calculating amount0: ${currentLiquidity} * ${arrivedAtSqrtPrice} - ${Math.sqrt(this.currentPrice)}`);
            let amount0UntilNextPrice = currentLiquidity * (arrivedAtSqrtPrice - Math.sqrt(this.currentPrice));
            journal[i].push(`Calculating amount1: ${currentLiquidity} * 1/${arrivedAtSqrtPrice} - 1/${Math.sqrt(this.currentPrice)}`);
            let amount1UntilNextPrice = currentLiquidity * (1 / arrivedAtSqrtPrice - 1 / Math.sqrt(this.currentPrice));

            amount0UntilNextPrice = amount0UntilNextPrice
            amount1UntilNextPrice = amount1UntilNextPrice

            journal[i].push(`Amount0 untilNextPrice (curLiq * (arrived - sqrt(curPrice)): ${amount0UntilNextPrice}`);
            journal[i].push(`Amount1 untilNextPrice (curLiq * (1/arrivedAtSqrtPrice - 1/sqrt(curPrice))): ${amount1UntilNextPrice}`);

            this.currentPrice = arrivedAtSqrtPrice ** 2;
            journal[i].push(`Arrived at price (not sqrt): ${this.currentPrice}`);
            
            if (amount1UntilNextPrice === -Infinity || isNaN(amount1UntilNextPrice)) {
                i += 1;
                continue;
            }
            
            amount += -amount0UntilNextPrice
            journal[i].push(`Remaining amount after adding ${amount1UntilNextPrice}: ${amount}`);

            investor.addBalance(this.tokenLeft.name, -amount0UntilNextPrice)
            investor.addBalance(this.tokenRight.name, Math.abs(amount1UntilNextPrice))
            
            this.totalSold += Math.abs(amount1UntilNextPrice)

            i += 1;
        } while(amount > 0 && 
            arrivedAtSqrtPrice === Math.sqrt(nextPricePoint) &&  
            this.currentRight < globalConfig.PRICE_MAX)

        journal.forEach(iteration => {
            // console.log(iteration.join('\n'));
        })
    }

    sell(amount, investor) {
        if (!investor) {
            console.error('You are trying to swap without providing reference to investor');
            return;
        }

        let prevPricePoint
        let currentLiquidity
        let arrivedAtSqrtPrice = 1 / Math.sqrt(this.currentPrice)
        
        let journal = []
        let i = 0

        do {
            journal[i] = [];

            prevPricePoint = this.currentLeft
            currentLiquidity = this.currentLiquidity
            arrivedAtSqrtPrice += amount / currentLiquidity

            if (arrivedAtSqrtPrice <= Math.sqrt(prevPricePoint)) {
                arrivedAtSqrtPrice = Math.sqrt(prevPricePoint)

                this.currentLiquidity -= this.pricePoints.get(prevPricePoint).liquidity * 1
                this.currentRight = this.pricePoints.get(prevPricePoint).right
                this.currentLeft = this.pricePoints.get(prevPricePoint).left
                this.currentPricePoint = prevPricePoint
            }
            
            let amount0UntilNextPrice = currentLiquidity * (1 / arrivedAtSqrtPrice - 1 / Math.sqrt(this.currentPrice));
            let amount1UntilNextPrice = currentLiquidity * (arrivedAtSqrtPrice.toFixed(9) - Math.sqrt(this.currentPrice.toFixed(9)));
            
            console.log(amount0UntilNextPrice, amount1UntilNextPrice)

            const tempNewPrice = arrivedAtSqrtPrice ** 2
            this.currentPrice = tempNewPrice < this.currentPricePoint ? this.currentPricePoint : tempNewPrice

            amount += -amount0UntilNextPrice

            investor.addBalance(this.tokenLeft.name, Math.abs(amount1UntilNextPrice))
            investor.addBalance(this.tokenRight.name, -amount0UntilNextPrice)
            this.totalSold -= Math.abs(-1 * parseFloat((amount0UntilNextPrice).toFixed(2)))

        } while(amount > 0 && 
            arrivedAtSqrtPrice === Math.sqrt(prevPricePoint) &&  
            this.currentLeft > globalConfig.PRICE_MIN)

        journal.forEach(iteration => {
            // console.log(iteration.join('\n'));
        })
    }
}
