export const pp2p = (pricePoint) => {
    return 2 ** pricePoint
}

export const p2pp = (price) => {
    return Math.log2(price)
}

export const formSwapData = (
    pool,
    investor,
    action,
    balanceLeft,
    balanceRight,
    totalAmountIn,
    totalAmountOut,
    paths
) => {
    return {
        pool: pool.name,
        price: pool.currentPrice.toFixed(4),
        investorHash: investor.hash,
        action: action,
        balanceLeft: balanceLeft,
        balanceRight: balanceRight,
        totalAmountIn,
        totalAmountOut,
        paths
    }
}

export const getCombinedSwaps = (smSwaps, pools) => {
    let combSwaps = {}
    smSwaps.forEach((smSwap) => {
        if (!combSwaps) {
            combSwaps = {}
        }
        if (!combSwaps[smSwap.pool]) {
            combSwaps[smSwap.pool] = {}
        }
        if (!combSwaps[smSwap.pool][smSwap.op]) {
            const pool = pools.find((pool) => pool.name === smSwap.pool)
            combSwaps[smSwap.pool][smSwap.op] = {
                pool,
                totalAmountIn: 0,
                totalAmountOut: 0,
                action: smSwap.op,
                path: smSwap.path
            }
        }

        combSwaps[smSwap.pool][smSwap.op].totalAmountIn -= smSwap.in
        combSwaps[smSwap.pool][smSwap.op].totalAmountOut += smSwap.out
    })

    return combSwaps
}
