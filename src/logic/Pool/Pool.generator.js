import Pool from './Pool.class';

// We can generate pools with different limits, existing liquidity, tick state, etc..
// Just need to add json file with types and iterate randomly or through percentage based summonning
export default (token0, token1) => {
    return new Pool(token0, token1);
}