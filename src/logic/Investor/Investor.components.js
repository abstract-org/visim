import React from 'react'
import { ProgressBar } from 'primereact/progressbar'
import { Dropdown } from 'primereact/dropdown'

import { numericValue } from '../Utils/uiUtils'
import { generateDefaultInvestors } from './Investor.generator'
import useInvestorStore from './investor.store'
import usePoolStore from '../Pool/pool.store'
import globalState from '../GlobalState'
import useQuestStore from '../Quest/quest.store'

const addInvestorsSelector = (state) => state.addInvestors
const setActiveSelector = (state) => state.setActive

export function InvestorModule({ children }) {
    const addInvestors = useInvestorStore(addInvestorsSelector)
    const investors = generateDefaultInvestors()

    investors.forEach((investor) => {
        globalState.investors.set(investor.hash, investor)
    })
    addInvestors(investors.map((investor) => investor.hash))

    return <div>{children}</div>
}

export function InvestorSelector() {
    const investors = useInvestorStore((state) => state.investors)
    const setActive = useInvestorStore(setActiveSelector)
    const activeInvestor = useInvestorStore((state) => state.active)

    const investorsValues = investors.map((investorHash) => ({
        label: `${globalState.investors.get(investorHash).type} (${
            globalState.investors.get(investorHash).id
        })`,
        value: globalState.investors.get(investorHash).hash
    }))

    return (
        <div>
            <Dropdown
                className="w-6"
                value={activeInvestor}
                options={investorsValues}
                onChange={(e) => setActive(e.value)}
                placeholder="Choose Investor"
            />
        </div>
    )
}

export function InvestorPoolBalance() {
    const activePool = usePoolStore((state) => state.active)
    const activeQuest = useQuestStore((state) => state.active)
    const activeInvestor = useInvestorStore((state) => state.active)
    const swaps = usePoolStore((state) => state.swaps)
    const valueLinks = usePoolStore((state) => state.valueLinks)

    let balanceContent = <p>Choose Pool to see balances</p>

    if (activePool && activeInvestor) {
        const pool = globalState.pools.get(activePool)
        const investor = globalState.investors.get(activeInvestor)

        balanceContent = (
            <div>
                <div className="grid">
                    <div className="col-6">
                        <p>
                            <b>{investor && pool.tokenLeft.name}</b>
                            &nbsp;Balance
                        </p>
                        <ProgressBar
                            value={
                                (investor &&
                                    Math.floor(
                                        investor.balances[pool.tokenLeft.name]
                                    )) ||
                                0
                            }
                            displayValueTemplate={numericValue}
                        ></ProgressBar>
                    </div>
                    <div className="col-6">
                        <p>
                            <b>{pool && pool.tokenRight.name}</b>&nbsp;Balance
                        </p>
                        <ProgressBar
                            value={
                                (investor &&
                                    Math.floor(
                                        investor.balances[pool.tokenRight.name]
                                    )) ||
                                0
                            }
                            displayValueTemplate={numericValue}
                        ></ProgressBar>
                    </div>
                </div>
                <div className="grid">
                    <div className="col-12 h-full">
                        <div>
                            {Object.entries(investor.balances).map(
                                (balance, idx) => {
                                    const floatClass =
                                        idx % 2 === 0 ? 'right' : 'left'
                                    if (
                                        balance[0] !== pool.tokenLeft.name &&
                                        balance[0] !== pool.tokenRight.name
                                    ) {
                                        return (
                                            <InvestorSingleBalance
                                                amount={balance[1]}
                                                token={balance[0]}
                                                key={idx}
                                                floatClass={floatClass}
                                            />
                                        )
                                    }
                                }
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return balanceContent
}

export const InvestorSingleBalance = (props) => {
    return (
        <div className="mb-1" style={{ float: props.floatClass, width: '49%' }}>
            <ProgressBar
                value={Math.floor(props.amount)}
                displayValueTemplate={() => {
                    return (
                        <div style={{ lineHeight: '1rem', color: '#00c933' }}>
                            <React.Fragment>
                                {props.token}: {props.amount}
                            </React.Fragment>
                        </div>
                    )
                }}
                style={{ height: '15px', fontSize: '10px' }}
            ></ProgressBar>
        </div>
    )
}
