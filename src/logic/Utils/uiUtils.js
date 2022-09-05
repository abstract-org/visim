import React from 'react'
import globalState from '../GlobalState'

export const numericValue = (value) => {
    return <React.Fragment>{value}</React.Fragment>
}

export const swapLog = (swapData) => {
    const investor = globalState.investors.get(swapData.investorHash)
    const pool = globalState.pools.get(swapData.pool)

    const action = swapData.action === 'buy' ? 'bought' : 'sold'
    const amounts =
        swapData.action === 'buy'
            ? `${Math.abs(
                  swapData.totalAmountOut.toFixed(4)
              ).toLocaleString()} ${pool.tokenRight.name} for ${Math.abs(
                  swapData.totalAmountIn.toFixed(4)
              ).toLocaleString()} ${pool.tokenLeft.name}`
            : `${Math.abs(
                  swapData.totalAmountOut.toFixed(4)
              ).toLocaleString()} ${pool.tokenRight.name} for ${Math.abs(
                  swapData.totalAmountIn.toFixed(4)
              ).toLocaleString()} ${pool.tokenLeft.name}`

    const paths = swapData.paths.length
        ? `through paths: ${swapData.paths.map(
              (path) => '[ ' + path.join(', ') + ' ]'
          )}`
        : ''
    return `Investor ${investor.type} (${investor.id}) ${action} ${amounts} ${paths}`
}
