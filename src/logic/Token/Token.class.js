import HashMap from 'hashmap';

import Pool from "../Pool/Pool.class";

import globalConfig from '../config.global.json'; // make it a hash map

export default class Token {
    id; // make uuid 
    name;
    pools = [];
    positions = [];

    constructor(name) {
        this.name = name;
    }

    createPool(token0, startingPrice = 0) {
        return new Pool(token0, this, startingPrice);
    }

    addToPool(pool) {
        this.pools.push(pool);
    }

    initializePoolPositions(pool) {
        const initial = globalConfig.INITIAL_LIQUIDITY; 
        const liquidityForLeft = [];

        initial.forEach(position => {
            let liquidity = pool.getLiquidityForAmounts(
                position.token0Amount,
                position.token1Amount,
                Math.sqrt(position.priceMin),
                Math.sqrt(position.priceMax),
                Math.sqrt(pool.currentPrice)
            );

            pool.setPositionSingle(position.priceMin, liquidity);
            liquidityForLeft.push({priceMax: position.priceMax, liquidity});
            
            // this.positions.push({poolName: pool.name, ...initializedPosition});
        });

        liquidityForLeft.forEach(liqItem => {
            pool.setPositionSingle(liqItem.priceMax, -liqItem.liquidity);
        });

        pool.pricePoints.forEach((value, key) => {
            console.log(value);
        })
    }

    setPoolPosition(amount0, amount1, priceMin, priceMax, currentPrice) {

    }
}
