import { Modules } from '@abstract-org/sdk'
import { LogicUtils } from '@abstract-org/sdk'

export const totalIssuedUSDC = (investors) =>
    investors
        .filter((x) => x.default)
        .reduce((acc, i) => acc + i.initialBalance, 0)

export const totalIssuedUSDCDynamic = (investors) =>
    investors
        .filter((x) => !x.default)
        .reduce((acc, i) => acc + i.initialBalance, 0)

export const totalIssuedTokens = (quests) =>
    quests
        .filter((x) => !(x instanceof Modules.UsdcToken))
        .map((q) => ({
            name: q.name,
            total: q.initialBalanceB
        }))

export const totalLockedUSDC = (pools) =>
    pools.reduce((acc, p) => {
        return p.isQuest() ? acc + p.volumeToken0 : acc + 0
    }, 0)

export const totalLockedTokens = (quests, pools) =>
    quests
        .filter((x) => !(x instanceof Modules.UsdcToken))
        .map((q) => {
            let totalQTokens = 0
            q.pools.forEach((p) => {
                if (pools) {
                    const pool = pools.find((qp) => qp.name === p)
                    totalQTokens +=
                        pool.tokenLeft === q.name
                            ? LogicUtils.isZero(pool.volumeToken0)
                                ? 0
                                : pool.volumeToken0
                            : LogicUtils.isZero(pool.volumeToken1)
                            ? 0
                            : pool.volumeToken1
                }
            })

            return { name: q.name, total: totalQTokens }
        })

export const totalWalletsUSDC = (investors) =>
    investors.reduce((acc, inv) => acc + inv.balances['USDC'], 0)

export const totalWalletsTokensWith0 = (quests, investors) =>
    quests
        .filter((x) => !(x instanceof Modules.UsdcToken))
        .map((q) => {
            const total =
                investors &&
                Array.isArray(investors) &&
                investors.reduce(
                    (sum, inv) =>
                        inv.balances[q.name] ? sum + inv.balances[q.name] : sum,
                    0
                )

            return {
                name: q.name,
                total: total || 0
            }
        })

export const totalWalletsTokens = (quests, investors) =>
    totalWalletsTokensWith0(quests, investors).filter((x) => x.total !== 0)

export const totalMissingUSDC = (investors, pools) =>
    totalIssuedUSDC(investors) +
    totalIssuedUSDCDynamic(investors) -
    totalLockedUSDC(pools) -
    totalWalletsUSDC(investors)

export const totalMissingTokens = (quests, pools, investors) =>
    quests
        .filter((x) => !(x instanceof Modules.UsdcToken))
        .map((q) => {
            let totalIssuedToken = totalIssuedTokens(quests).find(
                (ti) => ti.name === q.name
            )

            let totalLockedToken = totalLockedTokens(quests, pools).find(
                (tl) => tl.name === q.name
            )

            let totalWalletToken = totalWalletsTokens(quests, investors).find(
                (tw) => tw.name === q.name
            )

            if (!totalIssuedToken) {
                totalIssuedToken = { total: 0 }
            }

            if (!totalLockedToken) {
                totalLockedToken = { total: 0 }
            }

            if (!totalWalletToken) {
                totalWalletToken = { total: 0 }
            }

            return {
                name: q.name,
                total:
                    totalIssuedToken.total -
                    totalLockedToken.total -
                    totalWalletToken.total
            }
        })

export const totalSingleMissingToken = (
    tokenName,
    quests,
    pools,
    investors
) => {
    const totalMissing = totalMissingTokens(quests, pools, investors)
    const currentTokenData = totalMissing.find((t) => t.name === tokenName)

    return currentTokenData ? currentTokenData.total : -0.000000000001 // @FIXME: might be better to return null
}

/**
 * @description Makes map of current prices in USDC for each token of quest pools
 * @param {Pool[]} pools
 * @returns {Object<string,number>}
 */
export const getTokenPricesInUsdc = (pools) => {
    return pools
        .filter((p) => p.isQuest())
        .reduce(
            (result, pool) => ({
                ...result,
                [pool.tokenRight]: pool.curPrice
            }),
            {}
        )
}

/**
 * @description Having current token prices in USDC calculates NAV for Investor
 * @param {Investor} investor
 * @param {Object<string,number>} tokenPrices
 * @returns {number}
 */
const calcInvestorNav = (investor, tokenPrices) => {
    const invBalances = Object.entries(investor.balances)
    let nav = 0
    for (const [token, amount] of invBalances) {
        nav = parseFloat(nav)
        if (token === 'USDC') {
            nav += amount
        } else if (amount > 0 && tokenPrices[token] > 0) {
            nav += amount * tokenPrices[token]
        }
    }

    return nav
}

/**
 * @description Calculates and gathers map of NAV by investor.hash
 * @param investors
 * @param pools
 * @returns {*}
 */
export const calculateCurrentInvNavs = (investors, pools) => {
    const tokenPrices = getTokenPricesInUsdc(pools)

    return investors.reduce(
        (resultObj, investor) => ({
            ...resultObj,
            [investor.hash]: calcInvestorNav(investor, tokenPrices)
        }),
        {}
    )
}
