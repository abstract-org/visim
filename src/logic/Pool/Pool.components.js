import { useState } from 'react';

import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';

import usePoolStore from './pool.store';
import useInvestorStore from '../Investor/investor.store';
import globalState from '../GlobalState';

export const PoolSelector = () => {
    const pools = usePoolStore((state) => state.pools)
    const activePool = usePoolStore((state) => state.active)
    const setActive = usePoolStore((state) => state.setActive)

    const handleChoosePool = e => {
        setActive(pools.find(pool => pool === e.value))
    }

    return (
        <Dropdown 
            className="w-full mb-3" 
            value={activePool} 
            placeholder="Choose Pool"
            onChange={handleChoosePool}
            options={
                pools.map(pool => 
                    ({
                        label: `${globalState.pools.get(pool).tokenLeft.name} / ${globalState.pools.get(pool).tokenRight.name}`, 
                        value: globalState.pools.get(pool).name
                    }))
            } />
    )
}

export const PoolChartStats = () => {
    const activePool = usePoolStore((state) => state.active)
    const swaps = usePoolStore((state) => state.swaps)
    const nf = new Intl.NumberFormat('en-US')
    const tempTotalInPool = 20000

    const currentPrice = (activePool && globalState.pools.get(activePool).currentPrice)

    const totalValueLocked = (activePool && 
        nf.format(Math.abs(parseInt(globalState.pools.get(activePool).totalSold * currentPrice))))

    const marketCap = (activePool && nf.format(Math.abs(parseInt(tempTotalInPool * currentPrice))))

    return (
        <div className="flex">
            <div className="flex-grow-1 flex flex-column">
                <p>Current Price:</p>
                <h1>{currentPrice && currentPrice.toFixed(4) || 0}</h1>
            </div>
            <div className="flex-grow-1 flex flex-column">
                <p>Current Market Cap:</p>
                <h1>{marketCap || 0}</h1>
            </div>
            <div className="flex-grow-1 flex flex-column">
                <p>Total Value Locked:</p>
                <h1>{totalValueLocked || 0}</h1>
            </div>
        </div>
    )
}

export const SwapModule = () => {
    const [amount, setAmount] = useState(0)
    const activeInvestor = useInvestorStore((state) => state.active)
    const activePool = usePoolStore((state) => state.active)
    const swap = usePoolStore(state => state.swap)

    const investor = activeInvestor && globalState.investors.get(activeInvestor)
    const pool = activePool && globalState.pools.get(activePool)
    
    const handleBuy = () => {
        if (amount <= 0) {
            console.log('Cannot buy with amount 0')
            return
        }

        pool.buy(amount, investor)

        const swapData = {
            currentPrice: pool.currentPrice,
            investorHash: investor.hash,
            action: 'buy',
            balanceLeft: investor.balances[pool.tokenLeft.name],
            balanceRight: investor.balances[pool.tokenRight.name],
        }
        swap(swapData)
    }

    const handleSell = () => {
        if (amount <= 0) {
            console.log('Cannot sell with amount 0')
            return
        }

        pool.sell(amount, investor)

        const swapData = {
            currentPrice: pool.currentPrice,
            investorHash: investor.hash,
            action: 'sell',
            balanceLeft: investor.balances[pool.tokenLeft.name],
            balanceRight: investor.balances[pool.tokenRight.name],
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
                    <div>
                    <InputNumber className="w-full" value={amount} onChange={handleSetAmount} />
                    </div>
                </div>
            </div>
            <div className="grid">
                <div className="col-6 flex justify-content-center">
                    <Button className="p-button-success w-10 justify-content-center" label="Buy (in USDC)" onClick={handleBuy} />
                </div>
                <div className="col-6 flex justify-content-center">
                    <Button className="p-button-danger w-10" label="Sell Tokens" onClick={handleSell} />
                </div>
            </div>
        </div>
    )
}