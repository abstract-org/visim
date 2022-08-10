import HashMap from 'hashmap';

import Pool from "../Pool/Pool.class";

import globalConfig from '../config.global.json'; // make it a hash map
import UsdcToken from './UsdcToken.class';

export default class Token {
    id; // make uuid 
    name;
    pools = [];
    positions = new HashMap();

    constructor(name) {
        this.name = name;
    }

    createPool(token0 = null, startingPrice) {
        if (token0 === null) {
            token0 = new UsdcToken();
        }
        
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
        });

        liquidityForLeft.forEach(liqItem => {
            pool.setPositionSingle(liqItem.priceMax, -liqItem.liquidity);
        });

        this.positions.set(pool.name, pool.pricePoints.values());
    }
}
