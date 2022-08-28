import { useRef, useState } from 'react'

import { Dropdown } from 'primereact/dropdown'
import { InputNumber } from 'primereact/inputnumber'
import { Button } from 'primereact/button'
import { Messages } from 'primereact/messages'

import usePoolStore from './pool.store'
import useInvestorStore from '../Investor/investor.store'
import globalState from '../GlobalState'
import useQuestStore from '../Quest/quest.store'
import globalConfig from '../config.global.json'

export const PoolSelector = () => {
    const pools = usePoolStore((state) => state.pools)
    const activePool = usePoolStore((state) => state.active)
    const setActive = usePoolStore((state) => state.setActive)

    const handleChoosePool = (e) => {
        setActive(pools.find((pool) => pool === e.value))
    }

    return (
        <Dropdown
            className="w-full mb-3"
            value={activePool}
            placeholder="Choose Pool"
            onChange={handleChoosePool}
            options={pools.map((pool) => ({
                label: `${globalState.pools.get(pool).tokenLeft.name} / ${
                    globalState.pools.get(pool).tokenRight.name
                }`,
                value: globalState.pools.get(pool).name
            }))}
        />
    )
}

export const PoolChartStats = () => {
    const activePool = usePoolStore((state) => state.active)
    const swaps = usePoolStore((state) => state.swaps)
    const nf = new Intl.NumberFormat('en-US')
    const tempTotalInPool = globalConfig.TOTAL_RESERVES_DEFAULT

    const currentPrice =
        activePool && globalState.pools.get(activePool).currentPrice

    const totalValueLocked =
        activePool &&
        Number(
            (
                globalState.pools.get(activePool).totalSold * currentPrice
            ).toFixed(0)
        )

    const marketCap =
        activePool &&
        nf.format(Math.abs(parseInt(tempTotalInPool * currentPrice)))

    return (
        <div className="flex">
            <div className="flex-grow-1 flex flex-column">
                <p>Current Price:</p>
                <h1>{(currentPrice && currentPrice.toFixed(4)) || 0}</h1>
            </div>
            <div className="flex-grow-1 flex flex-column">
                <p>Current Market Cap:</p>
                <h1>{marketCap || 0}</h1>
            </div>
            <div className="flex-grow-1 flex flex-column">
                <p>Total Value Locked:</p>
                <h1>{nf.format(totalValueLocked) || 0}</h1>
            </div>
        </div>
    )
}

export const KnowledgeGraphStats = () => {
    const quests = useQuestStore((state) => state.quests)
    const pools = usePoolStore((state) => state.pools)
    const swaps = usePoolStore((state) => state.swaps)
    const nf = new Intl.NumberFormat('en-US')
    const tempTotalInPool = globalConfig.TOTAL_RESERVES_DEFAULT

    let marketCap = 0
    let totalValueLocked = 0

    pools.forEach((poolName) => {
        const pool = globalState.pools.get(poolName)

        if (pool.getType() === 'QUEST') {
            marketCap += pool.currentPrice * tempTotalInPool
            totalValueLocked += pool.currentPrice * pool.totalSold
        }
    })

    return (
        <div className="flex">
            <div className="flex-grow-1 flex flex-column">
                <p>Total Quests</p>
                <h1>{quests.length}</h1>
            </div>
            <div className="flex-grow-1 flex flex-column">
                <p>Total Market Cap:</p>
                <h1>{nf.format(Math.abs(parseInt(marketCap))) || 0}</h1>
            </div>
            <div className="flex-grow-1 flex flex-column">
                <p>Total Value Locked:</p>
                <h1>{nf.format(Number(totalValueLocked.toFixed(0))) || 0}</h1>
            </div>
        </div>
    )
}

export const SwapModule = () => {
    const msgs = useRef(null)
    const [amount, setAmount] = useState(0)
    const activeInvestor = useInvestorStore((state) => state.active)
    const activePool = usePoolStore((state) => state.active)
    const swap = usePoolStore((state) => state.swap)

    const investor = activeInvestor && globalState.investors.get(activeInvestor)
    const pool = activePool && globalState.pools.get(activePool)

    const handleBuy = () => {
        if (amount <= 0) {
            console.log('Cannot buy with amount 0')
            msgs.current.show({
                severity: 'warn',
                detail: 'Cannot buy with amount 0'
            })
            return
        }

        if (!activePool) {
            msgs.current.show({
                severity: 'warn',
                detail: 'Please select the pool first'
            })
            return
        }
        if (!activeInvestor) {
            msgs.current.show({
                severity: 'warn',
                detail: 'Please select the investor first'
            })
            return
        }
        if (investor.balances[pool.tokenLeft.name] < amount) {
            msgs.current.show({
                severity: 'warn',
                detail: `Not enough ${pool.tokenLeft.name} to purchase ${amount} of ${pool.tokenRight.name}`
            })
            return
        }

        let [totalAmountIn, totalAmountOut] = pool.buy(amount)
        investor.addBalance(pool.tokenLeft.name, totalAmountIn)
        investor.addBalance(pool.tokenRight.name, totalAmountOut)

        const swapData = {
            pool: pool.name,
            currentPrice: pool.currentPrice,
            investorHash: investor.hash,
            action: 'buy',
            balanceLeft: investor.balances[pool.tokenLeft.name],
            balanceRight: investor.balances[pool.tokenRight.name]
        }
        swap(swapData)
    }

    const handleSell = () => {
        if (amount <= 0) {
            console.log('Cannot sell with amount 0')
            msgs.current.show({
                severity: 'warn',
                detail: 'Cannot sell with amount 0'
            })
            return
        }

        if (!activePool) {
            msgs.current.show({
                severity: 'warn',
                detail: 'Please select the pool first'
            })
            return
        }
        if (!activeInvestor) {
            msgs.current.show({
                severity: 'warn',
                detail: 'Please select the investor first'
            })
            return
        }
        if (
            !investor.balances[pool.tokenRight.name] ||
            investor.balances[pool.tokenRight.name] < amount
        ) {
            msgs.current.show({
                severity: 'warn',
                detail: `Not enough ${pool.tokenRight.name} to purchase ${amount} of ${pool.tokenLeft.name}`
            })
            return
        }

        let [totalAmountIn, totalAmountOut] = pool.sell(amount)
        investor.addBalance(pool.tokenLeft.name, totalAmountOut)
        investor.addBalance(pool.tokenRight.name, totalAmountIn)

        const swapData = {
            currentPrice: pool.currentPrice,
            investorHash: investor.hash,
            action: 'sell',
            balanceLeft: investor.balances[pool.tokenLeft.name],
            balanceRight: investor.balances[pool.tokenRight.name]
        }
        swap(swapData)
    }

    const handleSetAmount = (e) => {
        setAmount(e.value)
    }

    return (
        <div>
            <div className="grid">
                <div className="col-6">
                    <PoolSelector />
                </div>
                <div className="col-6">
                    <InputNumber
                        value={amount}
                        onChange={handleSetAmount}
                        mode="decimal"
                        maxFractionDigits={9}
                    />
                </div>
            </div>
            <div className="grid">
                <div className="col-6 flex justify-content-center">
                    <Button
                        className="p-button-success w-10 justify-content-center"
                        label={`Buy (in ${
                            (pool && pool.tokenLeft.name) || 'USDC'
                        })`}
                        onClick={handleBuy}
                    />
                </div>
                <div className="col-6 flex justify-content-center">
                    <Button
                        className="p-button-danger w-10"
                        label={`Sell ${
                            (pool && pool.tokenRight.name) || 'Tokens'
                        }`}
                        onClick={handleSell}
                    />
                </div>
            </div>
            <div className="grid">
                <div className="col-12">
                    <Messages ref={msgs} />
                </div>
            </div>
        </div>
    )
}
