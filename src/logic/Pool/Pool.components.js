import { Button } from 'primereact/button'
import { Chip } from 'primereact/chip'
import { Dropdown } from 'primereact/dropdown'
import { InputNumber } from 'primereact/inputnumber'
import { Messages } from 'primereact/messages'
import { MultiStateCheckbox } from 'primereact/multistatecheckbox'
import React, { useRef, useState } from 'react'

import globalState from '../GlobalState'
import useInvestorStore from '../Investor/investor.store'
import useLogsStore from '../Logs/logs.store'
import { QuestSelector } from '../Quest/Quest.components'
import useQuestStore from '../Quest/quest.store'
import Router from '../Router/Router.class'
import { formSwapData, getCombinedSwaps, p2pp, pp2p } from '../Utils/logicUtils'
import globalConfig from '../config.global.json'
import usePoolStore from './pool.store'

export const PoolSelector = () => {
    const pools = usePoolStore((state) => state.pools)
    const activePool = usePoolStore((state) => state.active)
    const setActive = usePoolStore((state) => state.setActive)

    const handleChoosePool = (e) => {
        setActive(e.value)
    }

    return (
        <Dropdown
            className="w-full mb-3"
            value={activePool}
            placeholder="Choose Pool"
            onChange={handleChoosePool}
            options={pools.map((pool) => ({
                label: `${globalState.pools.get(pool).tokenLeft} / ${
                    globalState.pools.get(pool).tokenRight
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
    const pool = activePool && globalState.pools.get(activePool)

    const currentPrice = pool && pool.currentPrice
    const totalValueLocked = activePool && pool.getTVL()
    const marketCap = activePool && nf.format(pool.getMarketCap())

    return (
        <div className="flex">
            <div className="flex-grow-1 flex flex-column">
                <p>Current Price:</p>
                <h2>
                    {(pool &&
                        pool.currentPrice.toFixed(
                            globalConfig.USDC_DECIMAL_POINTS
                        )) ||
                        0}
                </h2>
            </div>
            {pool && pool.isQuest() ? (
                <div className="flex-grow-1 flex flex-column">
                    <p>Current Market Cap:</p>
                    <h2>{marketCap || 0}</h2>
                </div>
            ) : (
                ''
            )}
            {pool && pool.isQuest() ? (
                <div className="flex-grow-1 flex flex-column">
                    <p>Total Value Locked:</p>
                    <h2>{nf.format(totalValueLocked) || 0}</h2>
                </div>
            ) : (
                ''
            )}
            {pool ? (
                <div className="flex-grow-1 flex flex-column">
                    <p>Reserves:</p>
                    <span>
                        <h4>
                            {pool.tokenLeft}:{' '}
                            {nf.format(Math.round(pool.volumeToken0))}
                        </h4>
                    </span>
                    <span>
                        <h4>
                            {pool.tokenRight}:{' '}
                            {nf.format(Math.round(pool.volumeToken1))}
                        </h4>
                    </span>
                </div>
            ) : (
                ''
            )}
        </div>
    )
}

export const KnowledgeGraphStats = () => {
    const quests = useQuestStore((state) => state.quests)
    const pools = usePoolStore((state) => state.pools)
    const swaps = usePoolStore((state) => state.swaps)
    const nf = new Intl.NumberFormat('en-US')

    let marketCap = 0
    let totalValueLocked = 0
    let totalUSDCLocked = 0

    pools.forEach((poolName) => {
        const pool = globalState.pools.get(poolName)

        if (pool.isQuest()) {
            marketCap += pool.getMarketCap()
            totalValueLocked += pool.getTVL()
            totalUSDCLocked += pool.getUSDCValue()
        }
    })

    return (
        <div className="flex">
            <div className="flex-grow-1 flex flex-column">
                <p>Total Quests</p>
                <h2>{quests.length}</h2>
            </div>
            <div className="flex-grow-1 flex flex-column">
                <p>Total Market Cap:</p>
                <h2>{nf.format(Math.abs(parseInt(marketCap))) || 0}</h2>
            </div>
            <div className="flex-grow-1 flex flex-column">
                <p>Total Value Locked:</p>
                <h2>{nf.format(Number(totalValueLocked.toFixed(0))) || 0}</h2>
            </div>
            <div className="flex-grow-1 flex flex-column">
                <p>Total USDC locked:</p>
                <h2>{nf.format(Number(totalUSDCLocked.toFixed(0))) || 0}</h2>
            </div>
        </div>
    )
}

export const SwapModule = () => {
    const msgs = useRef(null)
    const [amount, setAmount] = useState(0)
    const activeInvestor = useInvestorStore((state) => state.active)
    const activePool = usePoolStore((state) => state.active)
    const activeQuest = useQuestStore((state) => state.active)
    const swap = usePoolStore((state) => state.swap)
    const addLogObj = useLogsStore((state) => state.addLogObj)
    const swapMode = usePoolStore((state) => state.swapMode)
    const router = new Router(
        globalState.quests.values(),
        globalState.pools.values()
    )

    const investor = activeInvestor && globalState.investors.get(activeInvestor)
    const pool = activePool && globalState.pools.get(activePool)
    const quest = activeQuest && globalState.quests.get(activeQuest)

    const handleBuy = () => {
        if (amount <= 0) {
            console.log('Cannot buy with amount 0')
            msgs.current.show({
                severity: 'warn',
                detail: 'Cannot buy with amount 0'
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

        if (investor.balances['USDC'] < amount) {
            msgs.current.show({
                severity: 'warn',
                detail: `Not enough USDC to purchase ${amount} of ${activeQuest}`
            })
            return
        }

        let tradePool = pool
        if (tradePool.tokenRight !== activeQuest) {
            const poolsOfQuest = globalState.pools
                .values()
                .filter((p) => quest.pools.includes(p))
            tradePool = poolsOfQuest.find(
                (qp) => qp.isQuest() && qp.tokenRight === activeQuest
            )
        }

        let [totalAmountIn, totalAmountOut] =
            swapMode === 'direct'
                ? tradePool.buy(amount)
                : router.smartSwap(
                      'USDC',
                      activeQuest,
                      amount,
                      globalConfig.CHUNK_SIZE
                  )

        investor.addBalance('USDC', totalAmountIn)
        investor.addBalance(activeQuest, totalAmountOut)
        globalState.investors.set(investor.hash, investor)

        if (swapMode === 'direct') {
            const swapData = formSwapData(
                pool,
                investor,
                'BOUGHT',
                totalAmountIn,
                totalAmountOut
            )
            swap(swapData)
            addLogObj(swapData)
        } else {
            const smSwaps = router.getSwaps()
            const combSwaps = getCombinedSwaps(
                smSwaps,
                globalState.pools.values()
            )

            Object.entries(combSwaps).forEach((ops) => {
                Object.entries(ops[1]).forEach((op) => {
                    const pool = globalState.pools.get(ops[0])
                    const swapData = formSwapData(
                        pool,
                        investor,
                        op[0],
                        op[1].totalAmountIn,
                        op[1].totalAmountOut,
                        op[1].path
                    )
                    swap(swapData)
                    addLogObj(swapData)
                })
            })
        }
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

        if (!activeInvestor) {
            msgs.current.show({
                severity: 'warn',
                detail: 'Please select the investor first'
            })
            return
        }
        if (
            !investor.balances[activeQuest] ||
            investor.balances[activeQuest] < amount
        ) {
            msgs.current.show({
                severity: 'warn',
                detail: `Not enough ${activeQuest} to purchase ${amount} of USDC`
            })
            return
        }

        let [totalAmountIn, totalAmountOut] =
            swapMode === 'direct'
                ? pool.sell(amount)
                : router.smartSwap(
                      activeQuest,
                      'USDC',
                      amount,
                      globalConfig.CHUNK_SIZE
                  )

        investor.addBalance('USDC', totalAmountOut)
        investor.addBalance(activeQuest, totalAmountIn)
        globalState.investors.set(investor.hash, investor)

        if (swapMode === 'direct') {
            const swapData = formSwapData(
                pool,
                investor,
                'SOLD',
                totalAmountIn,
                totalAmountOut
            )
            swap(swapData)
            addLogObj(swapData)
        } else {
            const smSwaps = router.getSwaps()
            const combSwaps = getCombinedSwaps(
                smSwaps,
                globalState.pools.values()
            )

            Object.entries(combSwaps).forEach((ops) => {
                Object.entries(ops[1]).forEach((op) => {
                    const pool = globalState.pools.get(ops[0])
                    const swapData = formSwapData(
                        pool,
                        investor,
                        op[0],
                        op[1].totalAmountIn,
                        op[1].totalAmountOut,
                        op[1].path
                    )
                    swap(swapData)
                    addLogObj(swapData)
                })
            })
        }
    }

    const handleSetAmount = (e) => {
        setAmount(e.value)
    }

    return (
        <React.Fragment>
            <div className="grid">
                <div className="col-6">
                    <QuestSelector />
                </div>
                <div className="col-6">
                    <InputNumber
                        value={amount}
                        onChange={handleSetAmount}
                        mode="decimal"
                        maxFractionDigits={9}
                        className="flex"
                    />
                </div>
            </div>
            <div className="grid">
                <div className="col-6 flex justify-content-center">
                    <Button
                        className="p-button-success w-10 justify-content-center"
                        label={`Buy in USDC`}
                        onClick={handleBuy}
                    />
                </div>
                <div className="col-6 flex justify-content-center">
                    <Button
                        className="p-button-danger w-10"
                        label={`Sell ${activeQuest || 'Tokens'}`}
                        onClick={handleSell}
                    />
                </div>
            </div>
            <div className="grid">
                <div className="col-12">
                    <Messages ref={msgs} />
                </div>
            </div>
        </React.Fragment>
    )
}

export const SwapMode = () => {
    const setSwapMode = usePoolStore((state) => state.setSwapMode)
    const swapMode = usePoolStore((state) => state.swapMode)

    const [value, setValue] = useState(swapMode || 'smart')
    const options = [
        { value: 'smart', icon: 'pi pi-share-alt' },
        { value: 'direct', icon: 'pi pi-directions' }
    ]

    const handleSwapMode = (e) => {
        setValue(e.value)
        setSwapMode(e.value)
    }

    return (
        <div className="field-checkbox m-0 flex">
            <MultiStateCheckbox
                value={swapMode}
                options={options}
                onChange={handleSwapMode}
                optionValue="value"
                empty={false}
            />
            <label>{swapMode}</label>
        </div>
    )
}

export const PoolPositions = (props) => {
    const activePool = usePoolStore((state) => state.active)
    const logObjs = useLogsStore((state) => state.logObjs)

    if (!activePool) {
        return <React.Fragment></React.Fragment>
    }

    const pool = globalState.pools.get(activePool)
    const positions = pool.posOwners.map((pos, idx) => {
        if (pos.liquidity === 0) return null

        return (
            <Chip
                key={idx}
                label={`[${pool.tokenLeft}: ${pos.amt0}] ${pos.pmin.toFixed(
                    2
                )}-${pos.pmax.toFixed(2)} [${pool.tokenRight}: ${pos.amt1}]`}
                icon={`${
                    pos.type === 'investor' ? 'pi-user' : 'pi-bitcoin'
                } pi`}
                className={`${
                    pos.type === 'investor'
                        ? 'investor-position'
                        : 'token-position'
                } mr-2 mb-2`}
            />
        )
    })

    return <React.Fragment>{positions}</React.Fragment>
}
