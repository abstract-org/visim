import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'
import { InputNumber } from 'primereact/inputnumber'
import { Messages } from 'primereact/messages'
import { MultiStateCheckbox } from 'primereact/multistatecheckbox'
import { useRef, useState } from 'react'

import globalState from '../GlobalState'
import useInvestorStore from '../Investor/investor.store'
import useLogsStore from '../Logs/logs.store'
import { QuestSelector } from '../Quest/Quest.components'
import useQuestStore from '../Quest/quest.store'
import Router from '../Router/Router.class'
import { formSwapData } from '../Utils/logicUtils'
import { swapLog } from '../Utils/uiUtils'
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
    const pool = activePool && globalState.pools.get(activePool)
    let reserves

    const currentPrice = pool && pool.currentPrice

    const totalValueLocked =
        activePool && Number((pool.totalSold * currentPrice).toFixed(0))

    const marketCap =
        activePool &&
        nf.format(Math.abs(parseInt(tempTotalInPool * currentPrice)))

    if (pool) {
        reserves = pool.getSwapInfo()
    }

    return (
        <div className="flex">
            <div className="flex-grow-1 flex flex-column">
                <p>Current Price:</p>
                <h1>{(currentPrice && currentPrice.toFixed(2)) || 0}</h1>
            </div>
            {pool && pool.getType() === 'QUEST' ? (
                <div className="flex-grow-1 flex flex-column">
                    <p>Current Market Cap:</p>
                    <h1>{marketCap || 0}</h1>
                </div>
            ) : (
                ''
            )}
            {pool && pool.getType() === 'QUEST' ? (
                <div className="flex-grow-1 flex flex-column">
                    <p>Total Value Locked:</p>
                    <h1>{nf.format(totalValueLocked) || 0}</h1>
                </div>
            ) : (
                ''
            )}
            {pool ? (
                <div className="flex-grow-1 flex flex-column">
                    <p>Reserves:</p>
                    <span>
                        <h4 className="m-1">
                            {pool.tokenLeft.name}{' '}
                            {reserves[1][1] > 0
                                ? nf.format(Math.round(reserves[1][1]))
                                : 0}
                        </h4>
                    </span>
                    <span className="m-1">
                        <h4>
                            {pool.tokenRight.name}{' '}
                            {reserves[0][1] > 0
                                ? nf.format(Math.round(reserves[0][1]))
                                : 0}
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
    const activeQuest = useQuestStore((state) => state.active)
    const swap = usePoolStore((state) => state.swap)
    const addLog = useLogsStore((state) => state.addLog)
    const swapMode = usePoolStore((state) => state.swapMode)
    const router = new Router(globalState)

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

        let [totalAmountIn, totalAmountOut] =
            swapMode === 'direct'
                ? pool.buy(amount)
                : router.smartSwap(
                      'USDC',
                      activeQuest,
                      amount,
                      globalConfig.CHUNK_SIZE
                  )
        console.log(swapMode, totalAmountIn, totalAmountOut, router.getPaths())

        investor.addBalance('USDC', totalAmountIn)
        investor.addBalance(activeQuest, totalAmountOut)
        globalState.investors.set(investor.hash, investor)

        if (swapMode === 'direct') {
            const swapData = formSwapData(
                pool,
                investor,
                'buy',
                investor.balances['USDC'],
                investor.balances[activeQuest],
                totalAmountIn,
                totalAmountOut,
                []
            )
            swap(swapData)
            const log = swapLog(swapData)
            addLog(`[HUMAN] ${log}`)
        } else {
            const smSwaps = router.getSwaps()
            console.log(smSwaps)
            let combSwaps = {}
            smSwaps.forEach((smSwap) => {
                if (!combSwaps) {
                    combSwaps = {}
                }
                if (!combSwaps[smSwap.pool]) {
                    combSwaps[smSwap.pool] = {}
                }
                if (!combSwaps[smSwap.pool][smSwap.op]) {
                    const pool = globalState.pools.get(smSwap.pool)
                    combSwaps[smSwap.pool][smSwap.op] = {
                        pool,
                        totalAmountIn: 0,
                        totalAmountOut: 0,
                        action: smSwap.op,
                        path: smSwap.path
                    }
                }

                combSwaps[smSwap.pool][smSwap.op].totalAmountIn -= smSwap.in
                combSwaps[smSwap.pool][smSwap.op].totalAmountOut += smSwap.out
            })

            Object.entries(combSwaps).forEach((ops) => {
                Object.entries(ops[1]).forEach((op) => {
                    const pool = globalState.pools.get(ops[0])
                    console.log(op[1])
                    const swapData = formSwapData(
                        pool,
                        investor,
                        op[0],
                        investor.balances['USDC'],
                        investor.balances[activeQuest],
                        op[1].totalAmountIn,
                        op[1].totalAmountOut,
                        op[1].path
                    )
                    console.log(swapData)
                    swap(swapData)
                    const log = swapLog(swapData)
                    addLog(`[SMART-ROUTE] ${log}`)
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
        console.log(swapMode, totalAmountIn, totalAmountOut, router.getPaths())
        investor.addBalance('USDC', totalAmountOut)
        investor.addBalance(activeQuest, totalAmountIn)
        globalState.investors.set(investor.hash, investor)

        if (swapMode === 'direct') {
            const swapData = formSwapData(
                pool,
                investor,
                'sell',
                investor.balances['USDC'],
                investor.balances[activeQuest],
                totalAmountIn,
                totalAmountOut,
                []
            )
            swap(swapData)
            const log = swapLog(swapData)
            addLog(`[HUMAN] ${log}`)
        } else {
            const smSwaps = router.getSwaps()
            let combSwaps = {}
            smSwaps.forEach((smSwap) => {
                if (!combSwaps) {
                    combSwaps = {}
                }
                if (!combSwaps[smSwap.pool]) {
                    combSwaps[smSwap.pool] = {}
                }
                if (!combSwaps[smSwap.pool][smSwap.op]) {
                    const pool = globalState.pools.get(smSwap.pool)
                    combSwaps[smSwap.pool][smSwap.op] = {
                        pool,
                        totalAmountIn: 0,
                        totalAmountOut: 0,
                        action: smSwap.op,
                        path: smSwap.path
                    }
                }

                combSwaps[smSwap.pool][smSwap.op].totalAmountIn -= smSwap.in
                combSwaps[smSwap.pool][smSwap.op].totalAmountOut += smSwap.out
            })

            Object.entries(combSwaps).forEach((ops) => {
                Object.entries(ops[1]).forEach((op) => {
                    const pool = globalState.pools.get(ops[0])
                    console.log(op[1])
                    const swapData = formSwapData(
                        pool,
                        investor,
                        op[0],
                        investor.balances['USDC'],
                        investor.balances[activeQuest],
                        op[1].totalAmountIn,
                        op[1].totalAmountOut,
                        op[1].path
                    )
                    console.log(swapData)
                    swap(swapData)
                    const log = swapLog(swapData)
                    addLog(`[SMART-ROUTE] ${log}`)
                })
            })
        }
    }

    const handleSetAmount = (e) => {
        setAmount(e.value)
    }

    return (
        <div>
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
        </div>
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
