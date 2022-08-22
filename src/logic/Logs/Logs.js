import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import useLogsStore from './logs.store'

export const LogsModule = () => {
    const logs = useLogsStore((state) => state.logs)

    const contents = logs.map((log, idx) => ({ block: idx, event: log }))

    return (
        <div>
            <DataTable
                value={contents}
                header="Logs"
                size="small"
                responsiveLayout="scroll"
                scrollable={true}
                scrollHeight={300}
                sortField="block"
                sortOrder={-1}
                resizableColumns
            >
                <Column
                    field="block"
                    header="Block"
                    style={{ width: '10%' }}
                    className="flex-none"
                ></Column>
                <Column
                    field="event"
                    header="Event"
                    style={{ width: '90%' }}
                    className="flex-none"
                ></Column>
            </DataTable>
        </div>
    )
}
