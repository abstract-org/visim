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

    const amounts =
        swapData.action === 'BOUGHT'
            ? `${Math.abs(swapData.totalAmountOut).toLocaleString()} ${
                  pool.tokenRight
              } for ${Math.abs(swapData.totalAmountIn).toLocaleString()} ${
                  pool.tokenLeft
              }`
            : `${Math.abs(swapData.totalAmountIn).toLocaleString()} ${
                  pool.tokenRight
              } for ${Math.abs(swapData.totalAmountOut).toLocaleString()} ${
                  pool.tokenLeft
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

export const capitalize = (str) => {
    return (str && str[0].toUpperCase() + str.slice(1)) || ''
}

export const calcCrossPoolThickness = (crossPool, citedPool, citingPool) => {
    const thicknessBy = {
        citingUsdcValue: citingPool && Math.log(citingPool.getUSDCValue()),
        citingMarketCap: Math.log(citingPool.getMarketCap()),
        citingTokenPrice: Math.log(citingPool.curPrice) * 10,
        crossPoolUsdcLocked: Math.log(
            citedPool.getUSDCValue() + citingPool.getUSDCValue()
        )
    }

    return thicknessBy.crossPoolUsdcLocked
}

export const appendIfNotExist = (arr, item) => {
    return Array.isArray(arr) && arr.indexOf(item) === -1
        ? arr.concat([item])
        : arr
}
