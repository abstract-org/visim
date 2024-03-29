import { Dropdown } from 'primereact/dropdown'
import { ProgressBar } from 'primereact/progressbar'
import React, { useEffect } from 'react'

import globalState from '../../GlobalState'
import useDayTrackerStore from '../../stores/dayTracker.store'
import useInvestorStore from '../../stores/investor.store'
import useLogsStore from '../../stores/logs.store'
import usePoolStore from '../../stores/pool.store'
import { calculateCurrentInvNavs } from '../../utils/tokenCalc'
import { BalanceBar } from '../ExtraUiComponents'
import { generateDefaultInvestors } from './Investor.generator'

const addInvestorsSelector = (state) => state.addInvestors
const setActiveSelector = (state) => state.setActive
const getInvestorBalances = (investors) => {
    return investors.reduce(
        (result, inv) => ({
            ...result,
            [inv.hash]: { ...inv.balances }
        }),
        {}
    )
}

export function InvestorModule({ children }) {
    const addInvestors = useInvestorStore(addInvestorsSelector)
    const currentDay = useDayTrackerStore((state) => state.currentDay)

    useEffect(() => {
        const investors = generateDefaultInvestors()
        investors.forEach((investor) => {
            if (!globalState.investors.has(investor.hash)) {
                globalState.investors.set(investor.hash, investor)
                globalState.investorStore.investors.push(investor.hash)
            }
            addInvestors(investors.map((investor) => investor.hash))
        })
    })

    useEffect(() => {
        const pools = globalState.pools.values()
        const investors = globalState.investors.values()
        if (currentDay > 0) {
            globalState.historical.investorNavs[currentDay - 1] =
                calculateCurrentInvNavs(investors, pools)
            globalState.historical.investorBalances[currentDay - 1] =
                getInvestorBalances(investors)
        }
    }, [currentDay])

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
        globalState.investorStore.active = investors[0]
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
    const logObjs = useLogsStore((state) => state.logObjs)

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
                                    const usdcPool = globalState.pools
                                        .values()
                                        .find(
                                            (p) => p.tokenRight === balance[0]
                                        )
                                    let usdcValue = 0
                                    if (usdcPool) {
                                        usdcValue =
                                            balance[1] * usdcPool.curPrice
                                    }
                                    return (
                                        <BalanceBar
                                            key={balance[0]}
                                            token={balance[0]}
                                            value={balance[1]}
                                            usdcValue={usdcValue}
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
        if (pool.isQuest() && balances[pool.tokenRight] && pool.curPrice > 0) {
            return acc + pool.curPrice * balances[pool.tokenRight]
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
