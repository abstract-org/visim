import { Badge } from 'primereact/badge'
import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { OverlayPanel } from 'primereact/overlaypanel'
import { Tooltip } from 'primereact/tooltip'
import React, { useEffect, useId, useRef, useState } from 'react'

import globalState from '../logic/GlobalState'
import useLogsStore from '../logic/Logs/logs.store'
import usePoolStore from '../logic/Pool/pool.store'
import UsdcToken from '../logic/Quest/UsdcToken.class'
import {
    totalIssuedTokens,
    totalIssuedUSDC,
    totalIssuedUSDCDynamic,
    totalLockedTokens,
    totalLockedUSDC,
    totalWalletsTokensWith0,
    totalWalletsUSDC
} from '../logic/Utils/tokenCalc'
import { getHighlightedText } from '../logic/Utils/uiUtils'

const nf = new Intl.NumberFormat('en-US')

const calculateMoneyLeaked = () => {
    const investors = globalState.investors.values()
    const pools = globalState.pools.values()
    const quests = globalState.quests.values()

    const totalLockedUSDCAmount = totalLockedUSDC(pools)
    const totalMissingUSDCAmount =
        totalIssuedUSDC(investors) +
        totalIssuedUSDCDynamic(investors) -
        totalLockedUSDCAmount -
        totalWalletsUSDC(investors)

    const totalIssuedTokensList = totalIssuedTokens(quests)
    const totalLockedTokensList = totalLockedTokens(quests, pools)
    const totalWalletsTokensList = totalWalletsTokensWith0(quests, investors)

    const totalMissingTokensList = quests
        .filter((x) => !(x instanceof UsdcToken))
        .map((q) => {
            const byQuestName = (item) => item.name === q.name
            const totalIssuedTokenAmount =
                totalIssuedTokensList.find(byQuestName).total
            const totalLockedTokenAmount =
                totalLockedTokensList.find(byQuestName).total
            const totalWalletTokenAmount =
                totalWalletsTokensList.find(byQuestName).total

            const totalLeakedAmount =
                totalIssuedTokenAmount -
                totalLockedTokenAmount -
                totalWalletTokenAmount

            return {
                name: q.name,
                leakedValue: totalLeakedAmount,
                leakRatio: totalLeakedAmount / totalLockedTokenAmount
            }
        })

    return {
        usdcLeaked: totalMissingUSDCAmount,
        usdcLeakRatio: totalMissingUSDCAmount / totalLockedUSDCAmount,
        tokensLeaked: totalMissingTokensList.filter(
            (leakData) => leakData.leakedValue !== 0
        )
    }
}

export const MoneyLeakBar = (props) => {
    const swaps = usePoolStore((state) => state.swaps)
    const logs = useLogsStore((state) => state.logObjs)
    const addLogObj = useLogsStore((state) => state.addLogObj)
    const [usdcLeaked, setUsdcLeaked] = useState(0)
    const [usdcLeakRatio, setUsdcLeakRatio] = useState(0)
    const [tokensLeaked, setTokensLeaked] = useState([])
    const keyID = useId()

    useEffect(() => {
        const prevUsdcLeaked = usdcLeaked
        const prevUsdcLeakRatio = usdcLeakRatio
        const leakTotal = calculateMoneyLeaked()
        setUsdcLeaked(leakTotal.usdcLeaked)
        setUsdcLeakRatio(leakTotal.usdcLeakRatio)
        setTokensLeaked(leakTotal.tokensLeaked)

        const isBigDeviation =
            Math.abs(leakTotal.usdcLeakRatio - prevUsdcLeakRatio) >
            0.1 * Math.abs(prevUsdcLeakRatio) // TODO: define leak ratio deviation percent (10% now)

        if (isBigDeviation) {
            const latestLog = logs.slice(-1)[0]
            const logData = {
                action: `LEAK`,
                opName: `USDC leak increased from ${prevUsdcLeaked} to ${leakTotal.usdcLeaked} now.`,
                ...latestLog
            }
            // addLogObj(logData)
            // globalState.logStore.logObjs.push(logData)
        }
    }, [swaps, logs])

    return (
        <React.Fragment>
            <TokenButton
                label="USDC"
                value={usdcLeaked}
                ratio={usdcLeakRatio}
                icon="pi pi-dollar"
            />
            {tokensLeaked.map((token) => (
                <TokenButton
                    key={keyID + token.name}
                    label={token.name}
                    value={token.leakedValue}
                    ratio={token.leakRatio || 0}
                    icon="none"
                />
            ))}
        </React.Fragment>
    )
}

const TokenButton = (props) => {
    const logs = useLogsStore((state) => state.logObjs)
    const isMounted = useRef(null)
    const op = useRef(null)

    useEffect(() => {
        isMounted.current = true
        op.current.hide()
    }, [])

    const getSeverity = (ratio) => {
        if (ratio < 0.000001) return 'success'
        if (ratio < 0.0001) return 'info'
        if (ratio < 0.01) return 'warning'
        if (ratio < 0.1) return 'danger'
    }

    const filterQuestRelated = (logList, questName) => {
        return logList
            .map((log, idx) => ({ ...log, idx: idx }))
            .filter((log) => {
                const isQuestInPool = log.pool?.includes(questName)
                const isQuestInOpName = log.opName?.includes(questName)
                const isQuestInPaths = log.paths?.includes(questName)

                return isQuestInPool || isQuestInOpName || isQuestInPaths
            })
        // .slice(-10)
    }

    return (
        <React.Fragment>
            <Button
                type="button"
                label={props.label}
                icon={props.icon}
                onClick={(e) => op.current.toggle(e)}
                aria-haspopup
                aria-controls="overlay_panel"
                className={`tip-button p-button-text p-button-sm pi-button-${getSeverity(
                    props.ratio
                )}`}
                tooltip={`Leaked value: ${
                    Math.abs(props.value) > 1
                        ? props.value.toFixed(2)
                        : props.value.toFixed(12)
                }\nLeaked-to-Total ratio: ${props.ratio?.toFixed(6) * 100}%`}
                tooltipOptions={{
                    position: 'bottom',
                    mouseTrack: true,
                    mouseTrackTop: 15
                }}
            >
                <Badge
                    value={nf.format(props.value.toFixed(2))}
                    severity={getSeverity(Math.abs(props.ratio))}
                />
                <Tooltip target=".tip-buton" mouseTrack mouseTrackLeft={10} />
            </Button>
            <OverlayPanel
                ref={op}
                dismissable
                showCloseIcon
                id="overlay_panel"
                style={{ width: 'auto' }}
            >
                <QuestLogTable
                    currentQuest={props.label}
                    data={filterQuestRelated(logs, props.label)}
                />
            </OverlayPanel>
        </React.Fragment>
    )
}

const QuestLogTable = (props) => {
    const pathsBody = (rowData) => {
        const pathNodes = rowData.paths ? rowData.paths.split('-') : []
        return (
            <React.Fragment>
                {pathNodes.map((currNode) => (
                    <div
                        key={currNode}
                        style={
                            props.currentQuest === currNode
                                ? {
                                      color: 'red',
                                      fontWeight: 'bold'
                                  }
                                : {}
                        }
                    >
                        {currNode}
                    </div>
                ))}
            </React.Fragment>
        )
    }

    const investorBody = (rowData) => {
        const investorName = globalState.investors.get(
            rowData.investorHash
        ).name

        return <span>{investorName}</span>
    }

    const poolBody = (rowData) => {
        return getHighlightedText(rowData.pool, props.currentQuest, {
            // color: 'red',
            fontWeight: 'bold'
        })
    }
    const opNameBody = (rowData) => {
        return getHighlightedText(rowData.opName, props.currentQuest, {
            color: 'red',
            fontWeight: 'bold'
        })
    }

    return (
        <div>
            <DataTable
                value={props.data}
                stripedRows
                sortMode="single"
                sortOrder={-1}
                sortField="idx"
                paginator
                rows={10}
                size="small"
            >
                <Column field="idx" header="Block" sortable />
                <Column field="day" header="Day" sortable />
                <Column field="pool" header="Pool" body={poolBody} />
                <Column field="price" header="Price" />
                <Column
                    field="investorHash"
                    header="Investor"
                    body={investorBody}
                />
                <Column field="action" header="Action" />
                <Column field="mcap" header="MarketCap" />
                <Column field="tvl" header="TVL" />
                <Column field="totalAmountIn" header="Total In" />
                <Column field="totalAmountOut" header="Total Out" />
                <Column field="price" header="Price" />
                <Column field="paths" header="Paths" body={pathsBody} />
                <Column
                    field="opName"
                    header="Op name"
                    style={{ maxWidth: '500px' }}
                    body={opNameBody}
                />
            </DataTable>
        </div>
    )
}