import { Column } from 'primereact/column'
import { ColumnGroup } from 'primereact/columngroup'
import { DataTable } from 'primereact/datatable'
import { ProgressBar } from 'primereact/progressbar'
import { Row } from 'primereact/row'
import { Sidebar } from 'primereact/sidebar'
import React, { useEffect, useRef, useState } from 'react'

import globalState from '../GlobalState'
import UsdcToken from '../Quest/UsdcToken.class'
import { quantile } from '../Utils/logicUtils'
import { aggregateTableData } from './InvestorPerf.service'

export const InvestorPerfSidebar = (props) => {
    return (
        <Sidebar
            visible={props.isVisible}
            position="left"
            dismissable
            closeOnEscape
            onHide={() => props.setVisible(false)}
            modal={true}
        >
            <h1>Investor Performance</h1>
            <InvestorPerf setSidebarVisible={props.setVisible} />
        </Sidebar>
    )
}

const aggregateTokenHolders = () => {
    const investorList = globalState.investors.values()
    const questList = globalState.quests.values()

    const totalIssuedTokens = questList
        .filter((x) => !(x instanceof UsdcToken))
        .reduce(
            (resultMap, quest) => ({
                ...resultMap,
                [quest.name]: quest.initialBalanceB
            }),
            {}
        )

    const tokenMap = investorList.reduce((tokens, inv) => {
        Object.entries(inv.balances).forEach(([quest, sum]) => {
            if (quest === 'USDC') return // TODO: should gather USDC info somewhere else
            if (!tokens[quest]) {
                tokens[quest] = {
                    name: '',
                    investors: [],
                    investorsTotal: 0,
                    issuedTotal: 0
                }
            }

            tokens[quest].name = quest
            tokens[quest].investors.push({
                investor: inv.name,
                investorType: inv.type,
                amount: sum
            })
            tokens[quest].investorsTotal += sum
            tokens[quest].issuedTotal = totalIssuedTokens[quest]
        })

        return tokens
    }, {})

    const tokenList = Object.entries(tokenMap).reduce(
        (resultList, [tokenName, currToken]) => {
            return [
                ...resultList,
                {
                    ...currToken,
                    name: tokenName
                }
            ]
        },
        []
    )

    tokenList.forEach((tokenData) => {
        tokenData.investors.forEach((investorItem) => {
            investorItem.percentage =
                investorItem.amount / tokenData.investorsTotal
            investorItem.percentageOfIssued =
                investorItem.amount / tokenData.issuedTotal
        })
    })

    return tokenList
}

const InvestorPerf = (props) => {
    const [tableContents, setTableContents] = useState([])
    const [expandedRows, setExpandedRows] = useState(null)
    const isMounted = useRef(false)

    useEffect(() => {
        isMounted.current = true
        setTableContents(aggregateTableData())
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const formatDecimal = (value = 0) => {
        return value.toLocaleString('en-US', {
            style: 'decimal',
            maximumFractionDigits: 2
        })
    }
    const formatPercent = (value = 0) => {
        return value.toLocaleString('en-US', {
            style: 'percent',
            minimumFractionDigits: 2
        })
    }

    const invPercentageBody = (rowData) => {
        return (
            <React.Fragment>
                <span>{formatPercent(rowData.percentageOfIssued)}</span>
                <ProgressBar
                    value={rowData.percentageOfIssued * 100}
                    showValue={false}
                />
            </React.Fragment>
        )
    }

    const rowExpansionTemplate = (data) => {
        return (
            <DataTable
                value={data.investors}
                responsiveLayout="scroll"
                size="small"
                rowGroupMode="rowspan"
                sortOrder={1}
                sortField="investorType"
                groupRowsBy="investorType"
            >
                <Column field="investorType" header="Investor type" />
                <Column field="investor" header="Investor" />
                <Column
                    field="amount"
                    header="Tokens amount"
                    dataType="numeric"
                    style={{ textAlign: 'left' }}
                />
                {/*<Column*/}
                {/*    field="percentage"*/}
                {/*    header="Percentage of bought, %"*/}
                {/*    dataType="numeric"*/}
                {/*    body={(rowData) => (*/}
                {/*        <span>{formatPercent(rowData.percentage)}</span>*/}
                {/*    )}*/}
                {/*/>*/}
                <Column
                    field="percentageOfIssued"
                    header="Investor's share, %"
                    body={invPercentageBody}
                />
            </DataTable>
        )
    }

    const inWalletsTotal = () => {
        let total = 0
        for (let rowData of tableContents) {
            total += rowData.investorsTotal
        }

        return formatDecimal(total)
    }

    const issuedGrandTotal = () => {
        let total = 0
        for (let rowData of tableContents) {
            total += rowData.issuedTotal
        }

        return formatDecimal(total)
    }

    const footerGroup = (
        <ColumnGroup>
            <Row>
                <Column
                    footer="Totals:"
                    colSpan={2}
                    footerStyle={{ textAlign: 'right' }}
                />
                <Column footer={inWalletsTotal} />
                <Column footer={issuedGrandTotal} />
            </Row>
        </ColumnGroup>
    )

    const groupHeaderTemplate = (rowData) => {
        return (
            <React.Fragment>
                <div style={{ fontWeight: 'bold' }}>{rowData.investorType}</div>
                <div>
                    <b>Total NAV: </b>
                    {formatDecimal(
                        calcInvestorsTotalNavByType(rowData.investorType)
                    )}
                </div>
                <div>
                    <b>NAV 95 percentile: </b>
                    {formatDecimal(
                        calcInvestorsNav95percentileByType(rowData.investorType)
                    )}
                </div>
            </React.Fragment>
        )
    }

    const calcInvestorsTotalNavByType = (invType) =>
        tableContents.reduce(
            (totalNav, rowData) =>
                rowData.investorType === invType
                    ? totalNav + rowData.currentNav
                    : totalNav,
            0
        )

    const calcInvestorsTotalAmountByType = (invType) =>
        tableContents.reduce(
            (totalAmount, rowData) =>
                rowData.investorType === invType
                    ? totalAmount + 1
                    : totalAmount,
            0
        )

    const calcInvestorsNav95percentileByType = (invType) => {
        const investorsNavList = tableContents
            .filter((row) => row.investorType === invType)
            .map((row) => row.currentNav)

        return quantile(investorsNavList, 0.95)
    }

    const groupFooterTemplate = (rowData) => {
        return (
            <React.Fragment>
                <span>
                    <b>Total investors: </b>
                    {calcInvestorsTotalAmountByType(rowData.investorType)}
                </span>
            </React.Fragment>
        )
    }

    return (
        <React.Fragment>
            <DataTable
                value={tableContents}
                expandedRows={expandedRows}
                onRowToggle={(e) => setExpandedRows(e.data)}
                responsiveLayout="scroll"
                rowExpansionTemplate={rowExpansionTemplate}
                groupRowsBy="investorType"
                rowGroupMode="subheader"
                rowGroupHeaderTemplate={groupHeaderTemplate}
                rowGroupFooterTemplate={groupFooterTemplate}
                sortMode="single"
                sortField="investorType"
                sortOrder={1}
                size="big"
                footerColumnGroup={footerGroup}
                scrollable
                scrollHeight="85vh"
            >
                {/*<Column field="investorType" header="Investor type" sortable />*/}
                <Column expander style={{ width: '3em' }} />
                <Column field="investorName" header="Investor name" sortable />
                <Column
                    field="initialBalance"
                    header="Initial balance"
                    // align="right"
                    // alignHeader="right"
                    body={({ initialBalance }) => formatDecimal(initialBalance)}
                    sortable
                />
                <Column
                    field="currentNav"
                    header="Current NAV"
                    // align="right"
                    // alignHeader="right"
                    body={({ currentNav }) => formatDecimal(currentNav)}
                    sortable
                />
            </DataTable>
        </React.Fragment>
    )
}
