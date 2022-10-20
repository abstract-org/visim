import { Divider } from 'primereact/divider'
import { Sidebar } from 'primereact/sidebar'
import React from 'react'

import globalState from '../logic/GlobalState'
import UsdcToken from '../logic/Quest/UsdcToken.class'

export const MoneyFlowSidebar = (props) => {
    return (
        <Sidebar
            visible={props.moneyflowVisible}
            position="left"
            dismissable
            closeOnEscape
            onHide={() => props.setMoneyflowVisible(false)}
            modal={true}
        >
            <h1>Money Flow</h1>
            <MoneyFlow />
        </Sidebar>
    )
}

const MoneyFlow = () => {
    const nf = new Intl.NumberFormat('en-US')

    const totalIssuedUSDC = globalState.investors
        .values()
        .filter((x) => x.default)
        .reduce((acc, i) => acc + i.initialBalance, 0)

    const totalIssuedUSDCDynamic = globalState.investors
        .values()
        .filter((x) => !x.default)
        .reduce((acc, i) => acc + i.initialBalance, 0)

    const totalIssuedTokens = globalState.quests
        .values()
        .filter((x) => !(x instanceof UsdcToken))
        .map((q) => ({
            name: q.name,
            total: q.initialBalanceB
        }))

    const totalLockedUSDC = globalState.pools.values().reduce((acc, p) => {
        return p.isQuest() ? acc + p.volumeToken0 : acc + 0
    }, 0)

    const totalLockedTokens = globalState.quests
        .values()
        .filter((x) => !(x instanceof UsdcToken))
        .map((q) => {
            let totalQTokens = 0

            q.pools.forEach((p) => {
                const pool = globalState.pools.get(p)
                console.log(q.name, pool.volumeToken0, pool.volumeToken1)
                totalQTokens +=
                    pool.tokenLeft === q.name
                        ? pool.volumeToken0
                        : pool.volumeToken1
            })

            return { name: q.name, total: totalQTokens }
        })

    const totalWalletsUSDC = globalState.investors
        .values()
        .reduce((acc, inv) => acc + inv.balances['USDC'], 0)

    const totalWalletsTokens = globalState.quests
        .values()
        .filter((x) => !(x instanceof UsdcToken))
        .map((q) => {
            let totalQTokens = 0

            globalState.investors.values().forEach((inv) => {
                totalQTokens += inv.balances[q.name] ? inv.balances[q.name] : 0
            })

            return { name: q.name, total: totalQTokens }
        })

    const totalMissingUSDC =
        totalIssuedUSDC +
        totalIssuedUSDCDynamic -
        totalLockedUSDC -
        totalWalletsUSDC

    const totalMissingTokens = globalState.quests
        .values()
        .filter((x) => !(x instanceof UsdcToken))
        .map((q) => {
            const totalIssuedToken = totalIssuedTokens.find(
                (ti) => ti.name === q.name
            )
            const totalLockedToken = totalLockedTokens.find(
                (tl) => tl.name === q.name
            )
            const totalWalletToken = totalWalletsTokens.find(
                (tw) => tw.name === q.name
            )

            return {
                name: q.name,
                total:
                    totalIssuedToken.total -
                    totalLockedToken.total -
                    totalWalletToken.total
            }
        })

    return (
        <React.Fragment>
            <div className="grid">
                <div className="col-6">
                    <h3>Total Issued</h3>
                    <div className="ml-2">
                        <div>
                            <b>Pre-Sim USDC</b>: {nf.format(totalIssuedUSDC)}
                        </div>
                        <div>
                            <b>Generated USDC</b>:{' '}
                            {nf.format(totalIssuedUSDCDynamic)}
                        </div>
                        <div>
                            {totalIssuedTokens.map((td, idx) => {
                                return (
                                    <div key={idx}>
                                        <b>{td.name}</b>: {nf.format(td.total)}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <Divider />
                    <h3>Total Locked</h3>
                    <div className="ml-2">
                        <div>
                            <b>USDC</b>: {nf.format(totalLockedUSDC)}
                        </div>
                        <div>
                            {totalLockedTokens.map((td, idx) => {
                                return (
                                    <div key={idx}>
                                        <b>{td.name}</b>: {nf.format(td.total)}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
                <div className="col-6">
                    <h3>In Wallets</h3>
                    <div className="ml-2">
                        <div>
                            <b>USDC</b>: {nf.format(totalWalletsUSDC)}
                        </div>
                        <div>
                            {totalWalletsTokens.map((td, idx) => {
                                return (
                                    <div key={idx}>
                                        <b>{td.name}</b>: {nf.format(td.total)}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <Divider />
                    <h3>Missing</h3>
                    <div className="ml-2">
                        <div style={{ fontWeight: 'bold' }}>
                            USDC:{' '}
                            <span
                                style={{
                                    color:
                                        totalMissingUSDC !== 0 ? 'red' : 'green'
                                }}
                            >
                                {nf.format(totalMissingUSDC)}
                            </span>
                        </div>
                        <div style={{ fontWeight: 'bold' }}>
                            {totalMissingTokens.map((td, idx) => {
                                return (
                                    <div key={idx}>
                                        {td.name}:{' '}
                                        <span
                                            style={{
                                                color:
                                                    td.total !== 0
                                                        ? 'red'
                                                        : 'green'
                                            }}
                                        >
                                            {nf.format(td.total)}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </React.Fragment>
    )
}
