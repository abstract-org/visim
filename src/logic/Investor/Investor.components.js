import { Dropdown } from 'primereact/dropdown'
import { ProgressBar } from 'primereact/progressbar'
import React, { useEffect } from 'react'

import { BalanceBar } from '../../components/ExtraUiComponents'
import globalState from '../GlobalState'
import usePoolStore from '../Pool/pool.store'
import UsdcToken from '../Quest/UsdcToken.class'
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
        label: `${globalState.investors.get(investorHash).name}`,
        value: globalState.investors.get(investorHash).hash
    }))

    useEffect(() => {
        setActive(investors[0])
    }, [investors, setActive])

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
    const activeInvestor = useInvestorStore((state) => state.active)
    const swaps = usePoolStore((state) => state.swaps)

    if (activeInvestor) {
        const investor = globalState.investors.get(activeInvestor)

        return (
            <React.Fragment>
                <NavBalance investor={investor} />
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
            </React.Fragment>
        )
    }
}

export const NavBalance = (props) => {
    const balances = props.investor.balances
    let nav = globalState.pools.values().reduce((acc, pool) => {
        acc = parseFloat(acc)
        if (
            pool.isQuest() &&
            balances[pool.tokenRight.name] &&
            pool.currentPrice > 0
        ) {
            return acc + pool.currentPrice * balances[pool.tokenRight.name]
        }
        return acc + 0
    }, 0)
    nav += balances['USDC']
    nav = Math.round(nav)
    return (
        <div className="grid">
            <div className="col-12">
                <div className="flex flex-wrap align-content-between justify-content-start">
                    <BalanceBar value={nav} token="NAV USDC" />
                </div>
            </div>
        </div>
    )
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
