import { Dropdown } from 'primereact/dropdown'
import { ProgressBar } from 'primereact/progressbar'
import React from 'react'

import { BalanceBar } from '../../components/ExtraUiComponents'
import globalState from '../GlobalState'
import usePoolStore from '../Pool/pool.store'
import useQuestStore from '../Quest/quest.store'
import { numericValue } from '../Utils/uiUtils'
import { generateDefaultInvestors } from './Investor.generator'
import useInvestorStore from './investor.store'

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
                className="w-12"
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

    if (activeInvestor) {
        const investor = globalState.investors.get(activeInvestor)

        const pool = {}

        return (
            <div className="grid">
                <div className="col-12">
                    <div className="flex flex-wrap align-content-between justify-content-start">
                        {Object.entries(investor.balances).map(
                            (balance, key) => {
                                return (
                                    <BalanceBar
                                        key={balance[0]}
                                        token={balance[0]}
                                        value={balance[1]}
                                    />
                                )
                            }
                        )}
                    </div>
                </div>
            </div>
        )

        return (
            <div>
                <div className="grid">
                    <div className="col-6">
                        <p>
                            <b>{investor && pool.tokenLeft.name}</b>
                            &nbsp;Balance
                        </p>
                        <BalanceBar
                            value={
                                (investor &&
                                    Math.floor(
                                        investor.balances[pool.tokenLeft.name]
                                    )) ||
                                0
                            }
                        />
                    </div>
                    <div className="col-6">
                        <p>
                            <b>{pool && pool.tokenRight.name}</b>&nbsp;Balance
                        </p>
                        <BalanceBar
                            value={
                                (investor &&
                                    Math.floor(
                                        investor.balances[pool.tokenRight.name]
                                    )) ||
                                0
                            }
                        />
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
