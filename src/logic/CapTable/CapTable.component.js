import { Column } from 'primereact/column'
import { ColumnGroup } from 'primereact/columngroup'
import { DataTable } from 'primereact/datatable'
import { Row } from 'primereact/row'
import { Sidebar } from 'primereact/sidebar'
import { Tooltip } from 'primereact/tooltip'
import React, { useEffect, useState } from 'react'

import globalState from '../GlobalState'

export const CapTableSidebar = (props) => {
    return (
        <Sidebar
            visible={props.isVisible}
            position="left"
            dismissable
            closeOnEscape
            onHide={() => props.setVisible(false)}
            modal={true}
        >
            <h1>CapTable</h1>
            <CapTable setSidebarVisible={props.setVisible} />
        </Sidebar>
    )
}

const combineInvestorBalances = (investor) =>
    Object.keys(investor.balances).map((balance) => {
        const usdcPool = globalState.pools
            .values()
            .find((p) => p.tokenRight === balance[0])

        return {
            token: balance[0],
            amount: balance[1],
            usdcValue: usdcPool ? balance[1] * usdcPool.curPrice : 0
        }
    }, [])

const aggregateInvestors = () => {
    let grandUsdcTotal = 0

    const investorList = globalState.investors.values().map((investor) => {
        const invQuests = combineInvestorBalances(investor)
        const usdcTotal = invQuests.reduce(
            (sum, invPool) => sum + invPool.usdcValue,
            0
        )
        grandUsdcTotal += usdcTotal

        return {
            invName: investor.name,
            invType: investor.type,
            usdcTotal,
            invQuests
        }
    })

    return investorList.map((inv) => ({
        ...inv,
        percentage: inv.usdcTotal / grandUsdcTotal
    }))
}

const CapTable = (props) => {
    const [capContents, setCapContents] = useState([])

    useEffect(() => {
        setCapContents(aggregateInvestors())
    }, [])

    const formatDecimal = (value = 0) => {
        return value.toLocaleString('en-US', {
            style: 'decimal',
            maximumFractionDigits: 2
        })
    }
    const formatPercent = (value = 0.00000001) => {
        return value.toLocaleString('en-US', {
            style: 'percent',
            minimumFractionDigits: 2
        })
    }

    const totalsUsdc = () => {
        let total = 0
        for (let rowData of capContents) {
            total += rowData.usdcTotal
        }

        return formatDecimal(total)
    }

    const totalsPercentage = () => {
        let total = 0
        for (let rowData of capContents) {
            total += rowData.percentage
        }

        return formatPercent(total)
    }

    const usdcTotalBody = (rowData) => {
        const tooltipText = rowData.invQuests.reduce(
            (resultStr, invPool) =>
                `${resultStr}\n${invPool.name}: ${invPool.investorShare} USDC`,
            ''
        )
        return (
            <div className="cell-usdc-total" data-pr-tooltip={tooltipText}>
                {rowData.usdcTotal}
                <Tooltip
                    target=".cell-usdc-total"
                    position="bottom"
                    mouseTrack
                    mouseTrackLeft={10}
                />
            </div>
        )
    }
    const footerGroup = (
        <ColumnGroup>
            <Row>
                <Column
                    footer="Totals:"
                    colSpan={2}
                    footerStyle={{ textAlign: 'right' }}
                />
                <Column footer={totalsUsdc} />
                <Column footer={totalsPercentage} />
            </Row>
        </ColumnGroup>
    )

    return (
        <React.Fragment>
            <DataTable
                value={capContents}
                footerColumnGroup={footerGroup}
                selectionMode="single"
                sortMode="multiple"
                size="small"
            >
                <Column field="invName" header="Investor name" sortable />
                <Column field="invType" header="Investor type" />
                <Column
                    field="usdcTotal"
                    header="UsdcTotal"
                    body={usdcTotalBody}
                />
                <Column field="percentage" header="Percentage" />
                <Column field="invQuests" hidden />
            </DataTable>
        </React.Fragment>
    )
}
