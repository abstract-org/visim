import React from 'react'

import globalState from '../GlobalState'

const nf = new Intl.NumberFormat('en-US')

export const numericValue = (value) => {
    return <React.Fragment>{value}</React.Fragment>
}

export const swapLog = (swapData) => {
    if (!swapData) return

    const investor = globalState.investors.get(swapData.investorHash)
    const pool = globalState.pools.get(swapData.pool)
    const poolFlip = pool.name.split('-').reduce((p, c) => `${c}-${p}`)

    const amounts =
        swapData.action === 'BOUGHT'
            ? `${Math.abs(swapData.totalAmountOut).toLocaleString()} ${
                  pool.tokenRight.name
              } for ${Math.abs(swapData.totalAmountIn).toLocaleString()} ${
                  pool.tokenLeft.name
              }`
            : `${Math.abs(swapData.totalAmountIn).toLocaleString()} ${
                  pool.tokenRight.name
              } for ${Math.abs(swapData.totalAmountOut).toLocaleString()} ${
                  pool.tokenLeft.name
              }`

    const paths = swapData.paths ? `through: ${swapData.paths}` : ''
    const day = swapData.day ? `[DAY ${swapData.day}] ` : ''
    const numData =
        swapData.mcap && swapData.tvl
            ? `\n\nPool state:\nMCAP: ${nf.format(
                  swapData.mcap
              )}\nTVL: ${nf.format(swapData.tvl)}`
            : ''
    return `${day}Investor ${investor.type} ${swapData.action} ${amounts} ${paths} ${numData}`
}
