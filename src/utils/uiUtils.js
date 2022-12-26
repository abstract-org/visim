import React from 'react'

import globalState from '../GlobalState'

const nf = new Intl.NumberFormat('en-US')

export const isNumericString = (str) => parseFloat(str) === Number(str)
export const fromBase64 = (b64) => decodeURIComponent(window.atob(b64))
export const toBase64 = (str) => window.btoa(encodeURIComponent(str))
export const getMissingQuestNames = (scenario) => {
    const quests = new Set()

    if (typeof scenario !== 'object') return

    scenario.invConfigs.forEach((conf) => {
        if (conf.excludeSingleName.length) {
            quests.add(conf.excludeSingleName)
        }

        if (conf.includeSingleName.length) {
            quests.add(conf.includeSingleName)
        }
    })

    scenario.questConfigs.forEach((conf) => {
        if (conf.citeSingleName.length) {
            quests.add(conf.citeSingleName)
        }
    })

    return Array.from(quests)
}

export const numericValue = (value) => {
    return <React.Fragment>{value}</React.Fragment>
}

export const swapLog = (swapData) => {
    if (!swapData) return

    const investor = globalState.investors.get(swapData.investorHash)
    const pool = globalState.pools.get(swapData.pool)

    const mcap = `MCAP: ${nf.format(swapData.mcap)}`
    const tvl = `TVL: ${nf.format(swapData.tvl)}`
    // @FIXME: Needs to be snapshotted during logging in generator
    const prices = `PRICES: ${pool.tokenLeft} ${nf.format(
        pool.priceToken0.toFixed(2)
    )} / ${pool.tokenRight} ${nf.format(pool.priceToken1.toFixed(2))}`
    // @FIXME: Needs to be snapshotted during logging in generator
    const volume = `VOLUME: ${pool.tokenLeft} ${nf.format(
        pool.volumeToken0
    )} / ${pool.tokenRight} ${nf.format(pool.volumeToken1)}`

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

    const paths = swapData.paths ? `through: [${swapData.paths}]` : ''
    const day = swapData.day ? `[DAY ${swapData.day}] ` : ''
    const numData =
        swapData.mcap && swapData.tvl ? `\n[STATE] ${mcap} | ${tvl}` : ''
    const intent = swapData.opName ? `\n[INTENT] ${swapData.opName}` : ''
    return `${day} ${investor.name} ${swapData.action} ${amounts} ${paths} ${numData} ${intent}`
}

export const capitalize = (str) => {
    return (str && str[0].toUpperCase() + str.slice(1)) || ''
}

export const calcCrossPoolThickness = (crossPool, citedPool, citingPool) => {
    const thicknessBy = {
        citingUsdcValue: citingPool && Math.log(citingPool.getUSDCValue()),
        citingMarketCap: citingPool && Math.log(citingPool.getMarketCap()),
        citingTokenPrice: citingPool && Math.log(citingPool.curPrice) * 10,
        crossPoolUsdcLocked:
            citedPool &&
            citingPool &&
            Math.log(citedPool.getUSDCValue() + citingPool.getUSDCValue())
    }

    return thicknessBy.crossPoolUsdcLocked
}

export const appendIfNotExist = (arr, item) => {
    return Array.isArray(arr) && arr.indexOf(item) === -1
        ? arr.concat([item])
        : arr
}

export const isWebDebug = () => {
    return 'debug' === window.location.search.replace(/\?/, '')
}

const escapeRegExp = (text) => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&')
}

export const getHighlightedText = (
    text = '',
    highlight = 'none',
    hlStyle = { fontWeight: 'bold' }
) => {
    // Split on highlight term and include term into parts, ignore case
    const hlPattern = escapeRegExp(highlight)
    const parts = text.split(new RegExp(`(${hlPattern})`, 'gi'))
    return (
        <span>
            {' '}
            {parts.map((part, i) => (
                <span
                    key={i}
                    style={
                        part.toLowerCase() === highlight.toLowerCase()
                            ? hlStyle
                            : {}
                    }
                >
                    {part}
                </span>
            ))}{' '}
        </span>
    )
}
