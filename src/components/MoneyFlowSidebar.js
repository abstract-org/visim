import { Divider } from 'primereact/divider'
import { Sidebar } from 'primereact/sidebar'
import React from 'react'

import globalState from '../GlobalState'
import {
    totalIssuedTokens,
    totalIssuedUSDC,
    totalIssuedUSDCDynamic,
    totalLockedTokens,
    totalLockedUSDC,
    totalMissingTokens,
    totalMissingUSDC,
    totalWalletsTokens,
    totalWalletsUSDC
} from '../utils/tokenCalc'

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

    return (
        <React.Fragment>
            <div className="grid">
                <div className="col-6">
                    <h3>Total Issued</h3>
                    <div className="ml-2">
                        <div>
                            <b>Pre-Sim USDC</b>:{' '}
                            {nf.format(
                                totalIssuedUSDC(globalState.investors.values())
                            )}
                        </div>
                        <div>
                            <b>Generated USDC</b>:{' '}
                            {nf.format(
                                totalIssuedUSDCDynamic(
                                    globalState.investors.values()
                                )
                            )}
                        </div>
                        <div>
                            {totalIssuedTokens(globalState.quests.values()).map(
                                (td, idx) => {
                                    return (
                                        <div key={idx}>
                                            <b>{td.name}</b>:{' '}
                                            {nf.format(td.total)}
                                        </div>
                                    )
                                }
                            )}
                        </div>
                    </div>
                    <Divider />
                    <h3>Total Locked</h3>
                    <div className="ml-2">
                        <div>
                            <b>USDC</b>:{' '}
                            {nf.format(
                                totalLockedUSDC(globalState.pools.values())
                            )}
                        </div>
                        <div>
                            {totalLockedTokens(
                                globalState.quests.values(),
                                globalState.pools.values()
                            ).map((td, idx) => {
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
                            <b>USDC</b>:{' '}
                            {nf.format(
                                totalWalletsUSDC(globalState.investors.values())
                            )}
                        </div>
                        <div>
                            {totalWalletsTokens(
                                globalState.quests.values(),
                                globalState.investors.values()
                            ).map((td, idx) => {
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
                                        totalMissingUSDC(
                                            globalState.investors.values(),
                                            globalState.pools.values()
                                        ) !== 0
                                            ? 'red'
                                            : 'green'
                                }}
                            >
                                {nf.format(
                                    totalMissingUSDC(
                                        globalState.investors.values(),
                                        globalState.pools.values()
                                    )
                                )}
                            </span>
                        </div>
                        <div style={{ fontWeight: 'bold' }}>
                            {totalMissingTokens(
                                globalState.quests.values(),
                                globalState.pools.values(),
                                globalState.investors.values()
                            ).map((td, idx) => {
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
