import { useState } from 'react';

import { Dropdown } from 'primereact/dropdown';
import { Card } from 'primereact/card';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';

import agoraInput from '../../styles/input.module.css';

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
            className="flex-none" 
            value={activePool} 
            placeholder="Choose Pool"
            onChange={handleChoosePool}
            options={
                pools.map(pool => 
                    ({
                        label: `${globalState.pools.get(pool).tokenLeft.name}/${globalState.pools.get(pool).tokenRight.name}`, 
                        value: globalState.pools.get(pool).name
                    }))
            } />
    )
}

export const PoolChartStats = () => {
    const activePool = usePoolStore((state) => state.active)
    const swaps = usePoolStore((state) => state.swaps)

    const currentPrice = (activePool && globalState.pools.get(activePool).currentPrice)
    let nf = new Intl.NumberFormat('en-US');

    return (
        <div className="flex">
            <div className="flex-grow-1 flex align-items-center">
                <div className="block">Current Price:</div>
                <div className="block">{activePool && globalState.pools.get(activePool).currentPrice}</div>
            </div>
            <div className="flex-grow-1 flex align-items-center justify-content-center">
                <p className="block">Current Market Cap:</p>
                <h4 className="block">{nf.format(20000 * (currentPrice))}</h4>
            </div>
            <div className="flex-grow-1 flex align-items-center justify-content-center">
                <div>Total Value Locked:</div>
                <Card style={{backgroundColor: '#f2f2f2'}}>
                <p>Research Paper: TBD</p>
                <p>USDC: TBD</p>
                </Card>
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
        console.log(pool)
        const swapData = {
            currentPrice: pool.currentPrice,
            investorHash: investor.hash,
            action: 'buy',
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
                    <div className={agoraInput.agoraSwap}>
                    <InputNumber value={amount} onChange={handleSetAmount} />
                    </div>
                </div>
            </div>
            <div className="grid">
                <div className="col-6">
                    <Button className="p-button-success" label="Buy (in USDC)" onClick={handleBuy} />
                </div>
                <div className="col-6">
                    <Button className="p-button-danger" label="Sell Tokens" />
                </div>
            </div>
        </div>
    )
}