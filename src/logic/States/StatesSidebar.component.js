import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Divider } from 'primereact/divider'
import { Fieldset } from 'primereact/fieldset'
import { InputText } from 'primereact/inputtext'
import { Sidebar } from 'primereact/sidebar'
import { Toast } from 'primereact/toast'
import React, { useEffect, useRef, useState } from 'react'

import StorageApi from '../../api/localStorage'
// import StorageApi from '../../api/states'
import globalState from '../GlobalState'
import useLogsStore from '../Logs/logs.store'
import usePoolStore from '../Pool/pool.store'
import useQuestStore from '../Quest/quest.store'
import {
    // DEFAULT_AGGREGATED_STATES,
    aggregateSnapshotTotals,
    overrideStateBySnapshot
} from './states.service'

const overrideSelector = (state) => state.override

export const StatesSidebar = (props) => {
    return (
        <Sidebar
            visible={props.visible}
            position="left"
            dismissable
            closeOnEscape
            onHide={() => props.setVisibleSidebar()}
            modal={true}
        >
            <h1>States</h1>
            <StatesTable />
        </Sidebar>
    )
}

const StatesTable = () => {
    const quests = useQuestStore((state) => state.quests)
    const pools = usePoolStore((state) => state.pools)
    const overrideLogs = useLogsStore(overrideSelector)
    const overrideQuests = useQuestStore(overrideSelector)
    const [snapshots, setSnapshots] = useState([])
    const [statesData, setStatesData] = useState([])
    const [currentStateInfo, setCurrentStateInfo] = useState({})
    const isMounted = useRef(null)

    const [newStateName, setNewStateName] = useState('')
    const toast = useRef(null)

    const saveCurrentState = async () => {
        const stateId = newStateName || `@${new Date().toISOString()}`
        setNewStateName(stateId)

        const response = await StorageApi.createState(stateId, {
            ...globalState
        })
        toast.current.show({
            severity: response.status === 201 ? 'success' : 'error',
            summary: response.status === 201 ? 'Success' : 'Error',
            detail: response.body
        })
    }

    const updateSnapshots = (snapshotsLoaded) => {
        if (snapshotsLoaded.status === 200) {
            setStatesData(snapshotsLoaded.body)
            setSnapshots(snapshotsLoaded.body.map(aggregateSnapshotTotals))
        } else {
            toast.current.show({
                severity: 'error',
                summary: 'Error',
                detail: snapshotsLoaded.body
            })
        }
    }

    useEffect(() => {
        isMounted.current = true

        StorageApi.getStates().then((snapshotsLoaded) => {
            updateSnapshots(snapshotsLoaded)
        })
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const snapshot = {
            stateId: newStateName || 'snapshotName',
            scenarioId: 0,
            state: { ...globalState }
        }

        setCurrentStateInfo(aggregateSnapshotTotals(snapshot))
    }, [newStateName, quests, pools])

    const handleStatesLoaded = async () => {
        const snapshotsLoaded = await StorageApi.getStates()

        updateSnapshots(snapshotsLoaded)
    }

    const loadState = ({ stateId }) => {
        const snapshot = statesData.find((s) => s.stateId === stateId)

        overrideLogs(snapshot.state.logs)
        overrideQuests(snapshot.state.questStore)
        overrideStateBySnapshot(snapshot)

        toast.current.show({
            severity: 'success',
            summary: 'Success',
            detail: 'Current state was overriden by snapshot'
        })
    }

    const textEditor = (options) => {
        return (
            <InputText
                type="text"
                value={options.value || ''}
                onChange={(e) => options.editorCallback(e.target.value)}
            />
        )
    }

    const actionSaveButton = (rowData) => {
        return (
            <React.Fragment>
                <Button
                    icon="pi pi-save"
                    iconPos="left"
                    label={`Save state`}
                    className="p-button-success mr-2"
                    onClick={saveCurrentState}
                />
            </React.Fragment>
        )
    }

    const actionLoadButton = (rowData) => {
        return (
            <React.Fragment>
                <Button
                    icon="pi pi-cloud-download"
                    iconPos="left"
                    label={'Load state'}
                    className="p-button-danger mr-2"
                    onClick={() => loadState(rowData)}
                />
            </React.Fragment>
        )
    }

    return (
        <>
            <Toast ref={toast} />
            <Fieldset legend="Current state">
                <DataTable
                    editMode="cell"
                    className="editable-cells-table"
                    value={[currentStateInfo]}
                    rows={1}
                >
                    <Column
                        key="stateId"
                        field="stateId"
                        header="Name"
                        style={{ width: '20%' }}
                        editor={(options) => textEditor(options)}
                        onCellEditComplete={(e) => {
                            setNewStateName(e.newValue)
                        }}
                    />
                    <Column field="totals" header="Totals" />
                    <Column field="totalTVL" header="Total TVL" />
                    <Column field="totalMCAP" header="Total MCAP" />
                    <Column field="totalUSDC" header="Total USDC" />
                    <Column
                        field="executionDate"
                        header="Execution Date"
                        sortable
                    />

                    <Column
                        body={actionSaveButton}
                        exportable={false}
                        style={{ minWidth: '8rem' }}
                    />
                </DataTable>
            </Fieldset>

            <Divider />

            <Fieldset
                legend="Remote states"
                toggleable
                collapsed={false}
                onExpand={handleStatesLoaded}
            >
                <DataTable
                    value={snapshots}
                    selectionMode="single"
                    sortMode="multiple"
                    paginator
                    rows={10}
                >
                    <Column field="stateId" header="Name" sortable />
                    <Column field="scenarioId" header="Scenario" sortable />
                    <Column field="totals" header="Totals" sortable />
                    <Column field="totalTVL" header="Total TVL" sortable />
                    <Column field="totalMCAP" header="Total MCAP" sortable />
                    <Column field="totalUSDC" header="Total USDC" sortable />
                    <Column
                        field="executionDate"
                        header="Execution Date"
                        sortable
                    />

                    <Column
                        body={actionLoadButton}
                        exportable={false}
                        style={{ minWidth: '8rem' }}
                    />
                </DataTable>
            </Fieldset>
        </>
    )
}
