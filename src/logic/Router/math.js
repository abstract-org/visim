/**
 *
 * @param {number} liq
 * @param {number} price
 * @param {number} nextPP // log2
 * @returns {array[[number, number], [number, number]]}
 */
export const getMaxOneShotBuy = (liq, price, nextPP) => {
    return [
        maxOneShotBuyIn(liq, price, nextPP),
        maxOneShotBuyOut(liq, price, nextPP)
    ]
}
export const getMaxOneShotSell = (liq, price, nextPP) => {
    return [
        maxOneShotSellIn(liq, price, nextPP),
        maxOneShotSellOut(liq, price, nextPP)
    ]
}

const maxOneShotBuyIn = (liq, price, nextPP) => {
    return liq * (Math.sqrt(2 ** nextPP) - Math.sqrt(price))
}
const maxOneShotBuyOut = (liq, price, nextPP) => {
    return liq * (1 / Math.sqrt(2 ** nextPP) - 1 / Math.sqrt(price))
}

const maxOneShotSellIn = (liq, price, nextPP) => {
    return liq * (1 / Math.sqrt(price) - 1 / Math.sqrt(2 ** nextPP))
}
const maxOneShotSellOut = (liq, price, nextPP) => {
    return liq * Math.sqrt(price) - Math.sqrt(2 ** nextPP)
}

/**
 * @description [buy] Returns how many token0 will be received for specified amount of token1 within the same liquidity
 * @param {number} liq
 * @param {number} price
 * @param {number} amount
 * @returns
 */
export const maxSameLiqBuyIn = (liq, price, amount) => {
    return (
        (liq * price * (amount * -1)) / (liq + Math.sqrt(price) * (amount * -1))
    )
}

/**
 * @description [buy] Returns how many token1 will be received for specified amount of token0 within the same liquidity
 * @param {number} liq
 * @param {number} price
 * @param {number} amount
 * @returns
 */
export const maxSameLiqBuyOut = (liq, price, amount) => {
    return liq * (1 / (Math.sqrt(price) + amount / liq) - 1 / Math.sqrt(price))
}

/**
 * @description [sell] Returns how many token1 will be received for specified amount of token0 within the same liquidity
 * @param {number} liq
 * @param {number} price
 * @param {number} amount
 * @returns
 */
export const maxSameLiqSellIn = (liq, price, amount) => {
    return (liq * amount) / (liq * price - Math.sqrt(price) * amount)
}

/**
 * @description [sell] Returns how many token0 will be received for specified amount of token1 within the same liquidity
 * @param {number} liq
 * @param {number} price
 * @param {number} amount
 * @returns
 */
export const maxSameLiqSellOut = (liq, price, amount) => {
    return liq * (Math.sqrt(price) - liq / (amount + liq / Math.sqrt(price)))
}
