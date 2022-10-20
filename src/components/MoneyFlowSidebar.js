import { filter } from 'lodash'
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
        .reduce((acc, i) => acc + i.initialBalance, 0)

    const totalIssuedTokens = globalState.quests
        .values()
        .filter((x) => !(x instanceof UsdcToken))
        .map((q) => ({
            name: q.name,
            total: q.initialBalanceB
        }))

    const totalLockedUSDC = globalState.pools.values().reduce((acc, p) => {
        return p.isQuest() ? acc + p.volumeToken0 : 0
    }, 0)

    const totalLockedTokens = globalState.quests
        .values()
        .filter((x) => !(x instanceof UsdcToken))
        .map((q) => {
            console.log(q)
            const total = q.pools.map((p) => {
                const pool = globalState.pools.get(p)

                console.log(pool)
            })

            console.log(total)
        })

    console.log(totalIssuedTokens)
    console.log(totalLockedTokens)

    return (
        <React.Fragment>
            <div>Total issued USDC: {nf.format(totalIssuedUSDC)}</div>
            <div>
                {totalIssuedTokens.map((td, idx) => {
                    return (
                        <div key={idx}>
                            Total Issued {td.name}: {nf.format(td.total)}
                        </div>
                    )
                })}
            </div>
            <div>----------</div>
            <div>Total USDC locked: {totalLockedUSDC}</div>
            <div>Total AAA locked: 0</div>
            <div>----------</div>
            <div>Total USDC in wallets: 0</div>
            <div>Total AAA in wallets: 0</div>
            <div>----------</div>
            <div>
                Total USDC missing:{' '}
                {totalIssuedUSDC - (totalIssuedUSDC - totalLockedUSDC)}
            </div>
            <div>Total AAA missing: 0</div>
        </React.Fragment>
    )
}
