import { Badge } from 'primereact/badge'
import { Button } from 'primereact/button'
import { Tooltip } from 'primereact/tooltip'
import React, { useEffect, useId, useState } from 'react'

import globalState from '../logic/GlobalState'
import usePoolStore from '../logic/Pool/pool.store'
import UsdcToken from '../logic/Quest/UsdcToken.class'

const nf = new Intl.NumberFormat('en-US')

const calculateMoneyLeaked = () => {
    const totalIssuedUSDC = globalState.investors
        .values()
        .filter((x) => x.default)
        .reduce((acc, i) => acc + i.initialBalance, 0)

    const totalIssuedUSDCDynamic = globalState.investors
        .values()
        .filter((x) => !x.default)
        .reduce((acc, i) => acc + i.initialBalance, 0)

    const totalIssuedTokens = globalState.quests
        .values()
        .filter((x) => !(x instanceof UsdcToken))
        .map((q) => ({
            name: q.name,
            total: q.initialBalanceB
        }))

    const totalLockedUSDC = globalState.pools.values().reduce((acc, p) => {
        return p.isQuest() ? acc + p.volumeToken0 : acc + 0
    }, 0)

    const totalLockedTokens = globalState.quests
        .values()
        .filter((x) => !(x instanceof UsdcToken))
        .map((q) => {
            let totalQTokens = 0

            q.pools.forEach((p) => {
                const pool = globalState.pools.get(p)
                totalQTokens +=
                    pool.tokenLeft === q.name
                        ? pool.volumeToken0
                        : pool.volumeToken1
            })

            return { name: q.name, total: totalQTokens }
        })

    const totalWalletsUSDC = globalState.investors
        .values()
        .reduce((acc, inv) => acc + inv.balances['USDC'], 0)

    const totalWalletsTokens = globalState.quests
        .values()
        .filter((x) => !(x instanceof UsdcToken))
        .map((q) => {
            let totalQTokens = 0

            globalState.investors.values().forEach((inv) => {
                totalQTokens += inv.balances[q.name] ? inv.balances[q.name] : 0
            })

            return { name: q.name, total: totalQTokens }
        })

    const totalMissingUSDC =
        totalIssuedUSDC +
        totalIssuedUSDCDynamic -
        totalLockedUSDC -
        totalWalletsUSDC

    const totalMissingTokens = globalState.quests
        .values()
        .filter((x) => !(x instanceof UsdcToken))
        .map((q) => {
            const totalIssuedToken = totalIssuedTokens.find(
                (ti) => ti.name === q.name
            )
            const totalLockedToken = totalLockedTokens.find(
                (tl) => tl.name === q.name
            )
            const totalWalletToken = totalWalletsTokens.find(
                (tw) => tw.name === q.name
            )

            const totalLeaked =
                totalIssuedToken.total -
                totalLockedToken.total -
                totalWalletToken.total

            return {
                name: q.name,
                leakedValue: totalLeaked,
                leakRatio: totalLeaked / totalLockedToken.total
            }
        })

    return {
        usdcLeaked: totalMissingUSDC,
        usdcLeakRatio: totalMissingUSDC / totalLockedUSDC,
        tokensLeaked: totalMissingTokens.filter(
            (leakData) => leakData.leakedValue !== 0
        )
    }
}

export const MoneyFeed = (props) => {
    const swaps = usePoolStore((state) => state.swaps)
    const [usdcLeaked, setUsdcLeaked] = useState(0)
    const [usdcLeakRatio, setUsdcLeakRatio] = useState(0)
    const [tokensLeaked, setTokensLeaked] = useState([])
    const keyID = useId()

    useEffect(() => {
        const leakTotal = calculateMoneyLeaked()
        setUsdcLeaked(leakTotal.usdcLeaked)
        setUsdcLeakRatio(leakTotal.usdcLeakRatio)
        setTokensLeaked(leakTotal.tokensLeaked)
    }, [swaps])

    return (
        // <Card className="h-full">
        <React.Fragment>
            <TokenBadge
                label="USDC"
                value={usdcLeaked}
                ratio={usdcLeakRatio}
                icon="pi pi-dollar"
            />
            {tokensLeaked.map((token) => (
                <TokenBadge
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

const TokenBadge = (props) => {
    const getSeverity = (ratio) => {
        if (ratio < 0.000001) return 'success'
        if (ratio < 0.0001) return 'info'
        if (ratio < 0.01) return 'warning'
        if (ratio < 0.1) return 'danger'
    }

    return (
        <Button
            type="button"
            label={props.label}
            icon={props.icon}
            className={`tip-button p-button-text p-button-sm pi-button-${getSeverity(
                props.ratio
            )}`}
            tooltip={`Leaked value: ${
                Math.abs(props.value) > 1
                    ? props.value.toFixed(2)
                    : props.value.toFixed(12)
            }\nLeaked-to-Locked ratio: ${props.ratio?.toFixed(6) * 100}%`}
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
    )
}
