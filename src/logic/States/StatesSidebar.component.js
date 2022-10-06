import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Divider } from 'primereact/divider'
import { Fieldset } from 'primereact/fieldset'
import { InputText } from 'primereact/inputtext'
import { Sidebar } from 'primereact/sidebar'
import { Toast } from 'primereact/toast'
import React, { useEffect, useRef, useState } from 'react'

import StatesApi from '../../api/states'
import globalState from '../GlobalState'
import usePoolStore from '../Pool/pool.store'
import useQuestStore from '../Quest/quest.store'
import {
    DEFAULT_AGGREGATED_STATES,
    aggregateSnapshotTotals,
    isValidStateList,
    overrideStateBySnapshot,
    rehydrateState,
    serializeState
} from './states.service'

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
    const [snapshots, setSnapshots] = useState(DEFAULT_AGGREGATED_STATES)
    const [statesData, setStatesData] = useState([])
    const [currentStateInfo, setCurrentStateInfo] = useState({})
    const isMounted = useRef(null)

    const [newStateName, setNewStateName] = useState('')
    const toast = useRef(null)

    const saveCurrentState = async () => {
        const stateId = newStateName || `@${new Date().toISOString()}`
        const serializedState = serializeState(globalState)

        localStorage.setItem(String(stateId), serializedState)
        toast.current.show({
            severity: 'success',
            summary: 'Success',
            detail: `State with name [ ${stateId} ] saved locally`
        })

        setNewStateName(stateId)
        const response = await StatesApi.createState(stateId, {
            quests: globalState.quests.values(),
            pools: globalState.pools.values(),
            investors: globalState.investors.values(),
            scenarioId: 'tbd' // TODO: getCurrentScenarioId
        })
        toast.current.show({
            severity: response.status === 201 ? 'success' : 'error',
            summary: response.status === 201 ? 'Success' : 'Error',
            detail: response.body
        })
    }

    const updateSnapshots = (snapshotsLoaded) => {
        const snapshotsHydrated = snapshotsLoaded.map((snapshot) => ({
            stateId: snapshot.stateId,
            scenarioId: snapshot.scenarioId,
            state: rehydrateState(snapshot.state)
        }))
        setStatesData(snapshotsHydrated)

        if (isValidStateList(snapshotsHydrated)) {
            setSnapshots(snapshotsHydrated.map(aggregateSnapshotTotals))
        }
    }

    useEffect(() => {
        isMounted.current = true

        StatesApi.getStates().then((snapshotsLoaded) => {
            updateSnapshots(snapshotsLoaded)
        })
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const snapshot = {
            stateId: newStateName || 'none',
            scenarioId: 0,
            state: {
                pools: globalState.pools.values(),
                quests: globalState.quests.values(),
                investors: globalState.investors.values()
            }
        }

        setCurrentStateInfo(aggregateSnapshotTotals(snapshot))
    }, [newStateName, quests, pools])

    const handleStatesLoaded = async () => {
        const snapshotsLoaded = await StatesApi.getStates()

        updateSnapshots(snapshotsLoaded)
    }
    const loadState = async ({ stateId }) => {
        const stateData = statesData.find((s) => (s.stateId = stateId))

        overrideStateBySnapshot(stateData)
    }

    const textEditor = (options) => {
        return (
            <InputText
                type="text"
                value={options.value}
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
                    label={`Load state ${rowData.stateId}`}
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
                        // body={stateNameEditorBody}
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
