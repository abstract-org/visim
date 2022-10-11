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
    totalAmountIn,
    totalAmountOut,
    paths,
    day
) => {
    return {
        pool: pool ? pool.name : '',
        price: pool ? pool.currentPrice.toFixed(3) : 0,
        investorHash: investor.hash,
        action: action,
        mcap: pool.isQuest() ? pool.getMarketCap() : '',
        tvl: pool.isQuest() ? pool.getTVL() : '',
        totalAmountIn: totalAmountIn ? totalAmountIn.toFixed(3) : '',
        totalAmountOut: totalAmountOut ? totalAmountOut.toFixed(3) : '',
        paths: paths ? paths.join('-') : '',
        day: day || ''
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
            const pool = pools.find(byName(smSwap.pool))
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

export const byName = (name) => (item) => item.name === name

export const updateStateInvestorConfig = (arr, newItem) =>
    arr.map((item) =>
        item.invGenAlias === newItem.invGenAlias ? newItem : item
    )

export const updateStateQuestConfig = (arr, newItem) =>
    arr.map((item) =>
        item.questGenAlias === newItem.questGenAlias ? newItem : item
    )

export const deleteStateInvestorConfig = (arr, invGenAlias) =>
    arr.filter((item) => item.invGenAlias !== invGenAlias)

export const deleteStateQuestConfig = (arr, questGenAlias) =>
    arr.filter((item) => item.questGenAlias !== questGenAlias)

export const toBase64 = (str) => window.btoa(encodeURIComponent(str))

export const fromBase64 = (b64) => decodeURIComponent(window.atob(b64))

export const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export const overrideState = (stateObj, newData = {}, initialState = {}) => {
    let newState = initialState
    if (newData) {
        Object.entries(newData).forEach(([key, newValue]) => {
            console.log(key)
            if (stateObj[key] && newData[key]) {
                newState[key] = newValue
            }
        })
    }

    return newState
}
