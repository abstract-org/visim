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
