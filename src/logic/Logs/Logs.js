import { FilterMatchMode, FilterOperator } from 'primereact/api'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dropdown } from 'primereact/dropdown'
import { useState } from 'react'

import globalState from '../GlobalState'
import useLogsStore from './logs.store'

export const LogsModule = () => {
    const logObjs = useLogsStore((state) => state.logObjs)
    const [filters, setFilters] = useState({
        investor: { value: null, matchMode: FilterMatchMode.EQUALS },
        pool: { value: null, matchMode: FilterMatchMode.EQUALS },
        action: { value: null, matchMode: FilterMatchMode.EQUALS }
    })

    const pools = new Set()
    const invs = new Set()
    const actions = new Set()
    let dayIter = 0
    const contents = logObjs.map((log, idx) => {
        pools.add(log.pool)
        const invType = globalState.investors.get(log.investorHash).name
        invs.add(invType)
        actions.add(log.action.toUpperCase())

        if (log.day) {
            dayIter = log.day
        }

        return {
            block: idx,
            day: dayIter,
            action: log.action.toUpperCase(),
            pool: log.pool,
            poolMcap: log.mcap,
            poolTvl: log.tvl,
            amountIn: log.totalAmountIn,
            amountOut: log.totalAmountOut,
            price: log.price,
            investor: globalState.investors.get(log.investorHash).name,
            path: log.paths,
            opName: log.opName
        }
    })

    const poolTmpl = (rowData) => {
        return <span>{rowData.pool}</span>
    }
    const poolItemTmpl = (option) => {
        return <span>{option}</span>
    }
    const poolFilterTmpl = (options) => {
        return (
            <Dropdown
                value={options.value}
                options={[...pools]}
                onChange={(e) => options.filterApplyCallback(e.value)}
                itemTemplate={poolItemTmpl}
                placeholder="Pools"
                className="p-column-filter"
                showClear
            />
        )
    }

    const actTmpl = (rowData) => {
        return <span>{rowData.action}</span>
    }
    const actItemTmpl = (option) => {
        return <span>{option}</span>
    }
    const actFilterTmpl = (options) => {
        return (
            <Dropdown
                value={options.value}
                options={[...actions]}
                onChange={(e) => options.filterApplyCallback(e.value)}
                itemTemplate={actItemTmpl}
                placeholder="Actions"
                className="p-column-filter"
                showClear
            />
        )
    }

    const invTmpl = (rowData) => {
        return <span>{rowData.investor}</span>
    }
    const invItemTmpl = (option) => {
        return <span>{option}</span>
    }
    const invFilterTmpl = (options) => {
        return (
            <Dropdown
                value={options.value}
                options={[...invs]}
                onChange={(e) => options.filterApplyCallback(e.value)}
                itemTemplate={invItemTmpl}
                placeholder="Investors"
                className="p-column-filter"
                showClear
            />
        )
    }

    return (
        <div>
            <DataTable
                dataKey="id"
                filters={filters}
                filterDisplay="row"
                value={contents}
                header="Logs"
                size="small"
                responsiveLayout="scroll"
                scrollable={true}
                scrollHeight={300}
                sortField="block"
                sortOrder={-1}
                stripedRows
                paginator
                rows={100}
                className="text-sm"
            >
                <Column
                    field="block"
                    header="Blk"
                    className="w-4rem flex-none"
                    sortable
                ></Column>
                <Column
                    field="day"
                    header="Day"
                    className="w-4rem flex-none"
                    sortable
                ></Column>
                <Column
                    field="investor"
                    header="Investor"
                    className="w-10rem cfilters flex-none"
                    body={invTmpl}
                    showFilterMenu={false}
                    filter
                    filterElement={invFilterTmpl}
                ></Column>
                <Column
                    field="action"
                    header="Action"
                    className="w-10rem cfilters flex-none"
                    body={actTmpl}
                    showFilterMenu={false}
                    filter
                    filterElement={actFilterTmpl}
                ></Column>
                <Column
                    field="pool"
                    header="Pool"
                    className="w-10rem cfilters flex-none"
                    body={poolTmpl}
                    showFilterMenu={false}
                    filter
                    filterElement={poolFilterTmpl}
                ></Column>
                <Column
                    field="poolMcap"
                    header="MCAP"
                    className="w-1 flex-none"
                    sortable
                ></Column>
                <Column
                    field="poolTvl"
                    header="TVL"
                    className="w-1 flex-none"
                    sortable
                ></Column>
                <Column
                    field="amountIn"
                    header="Paid"
                    className="w-1 flex-none"
                    sortable
                ></Column>
                <Column
                    field="amountOut"
                    header="Received"
                    className="w-1 flex-none"
                    sortable
                ></Column>
                <Column
                    field="price"
                    header="Price"
                    className="w-1 flex-none"
                    sortable
                ></Column>
                <Column
                    field="path"
                    header="Path"
                    className="w-1 flex-none text-xs"
                ></Column>
                <Column
                    field="opName"
                    header="OP"
                    className="w-1 flex-none"
                ></Column>
            </DataTable>
        </div>
    )
}
