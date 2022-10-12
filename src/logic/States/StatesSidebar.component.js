import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Divider } from 'primereact/divider'
import { Fieldset } from 'primereact/fieldset'
import { InputText } from 'primereact/inputtext'
import { ProgressSpinner } from 'primereact/progressspinner'
import { Sidebar } from 'primereact/sidebar'
import { Toast } from 'primereact/toast'
import React, { useEffect, useRef, useState } from 'react'

import { getPresignedUrl } from '../../api/s3'
import StorageApi from '../../api/states'
import useGeneratorStore from '../Generators/generator.store'
import globalState from '../GlobalState'
import useInvestorStore from '../Investor/investor.store'
import useLogsStore from '../Logs/logs.store'
import usePoolStore from '../Pool/pool.store'
import useQuestStore from '../Quest/quest.store'
import { formatBytes } from '../Utils/logicUtils'
import { downloadStateFrom, getContentLength } from './download.service'
import {
    aggregateSnapshotTotals,
    base64ToState,
    overrideStateBySnapshot
} from './states.service'
import { uploadStateTo } from './upload.service'

const overrideSelector = (state) => state.override

export const StatesSidebar = (props) => {
    return (
        <Sidebar
            visible={props.sidebarVisible}
            position="left"
            dismissable
            closeOnEscape
            onHide={() => props.setSidebarVisible(false)}
            modal={true}
        >
            <h1>States</h1>
            <StatesTable setSidebarVisible={props.setSidebarVisible} />
        </Sidebar>
    )
}

const StatesTable = (props) => {
    const quests = useQuestStore((state) => state.quests)
    const pools = usePoolStore((state) => state.pools)
    const scenarioId = useGeneratorStore((state) => state.scenarioId)
    const overrideLogs = useLogsStore(overrideSelector)
    const overrideQuests = useQuestStore(overrideSelector)
    const overridePools = usePoolStore(overrideSelector)
    const overrideGenerators = useGeneratorStore(overrideSelector)
    const overrideInvestors = useInvestorStore(overrideSelector)
    const [snapshots, setSnapshots] = useState([])
    const [currentStateInfo, setCurrentStateInfo] = useState({})
    const isMounted = useRef(null)
    const [loaderData, setLoaderData] = useState({
        fileSize: 0,
        active: false,
        message: ''
    })
    const [newStateName, setNewStateName] = useState('')
    const toast = useRef(null)

    const saveCurrentState = async () => {
        const stateId = newStateName || `@${new Date().toISOString()}`
        setNewStateName(stateId)

        const state = { state: globalState, stateId, scenarioId }
        const stateDetails = aggregateSnapshotTotals(state)

        setLoaderData({
            active: true,
            message: 'Getting presigned URL'
        })
        const s3Response = await getPresignedUrl(stateId)

        if (!s3Response || s3Response.status !== 201) {
            setLoaderData({ active: false })
            console.log('Error getting presigned URL')
            toast.current.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Error getting presigned URL'
            })
            return
        }

        const stateBody = {
            stateDetails,
            state: { ...globalState }
        }
        const size = JSON.stringify(stateBody).length

        setLoaderData({
            active: true,
            fileSize: size,
            message: 'Uploading state'
        })

        const presignedUrl = s3Response.body
        const s3UploadResult = await uploadStateTo(presignedUrl, stateBody)

        if (!s3UploadResult.ok) {
            setLoaderData({ active: false })
            console.log('Error uploading file')
            toast.current.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Error uploading file'
            })
            return
        }

        const strippedStateLocation = s3UploadResult.url.split('?')[0]

        const response = await StorageApi.createStateRecord(
            stateId,
            stateDetails,
            strippedStateLocation,
            scenarioId
        )

        if (!response || response.status !== 201) {
            console.log(response)
            toast.current.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Error setting state record'
            })
        }

        toast.current.show({
            severity: response.status === 201 ? 'success' : 'error',
            summary: response.status === 201 ? 'Success' : 'Error',
            detail: response.body
        })
        setLoaderData({ active: false })
    }

    const updateSnapshots = (snapshotsLoaded) => {
        if (snapshotsLoaded.status === 200) {
            setSnapshots(snapshotsLoaded.body)
        } else {
            if (snapshotsLoaded.status === 404) {
                // Empty list is not an error
                return
            }

            toast.current.show({
                severity: 'error',
                summary: 'Error',
                detail: snapshotsLoaded.body
            })
        }
    }

    useEffect(() => {
        isMounted.current = true

        StorageApi.getStates()
            .then((snapshotsLoaded) => {
                if (snapshotsLoaded) {
                    updateSnapshots(snapshotsLoaded)
                }
            })
            .catch((err) => {
                console.log(err)
            })
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const snapshot = {
            stateId: newStateName || 'snapshotName',
            scenarioId,
            state: { ...globalState }
        }

        setCurrentStateInfo(aggregateSnapshotTotals(snapshot))
    }, [newStateName, quests, pools, scenarioId])

    const handleStatesLoaded = async () => {
        const snapshotsLoaded = await StorageApi.getStates()

        updateSnapshots(snapshotsLoaded)
    }

    const loadState = async ({ stateId, stateLocation }) => {
        const size = await getContentLength(stateLocation)
        setLoaderData({
            active: true,
            message: 'Downloading state',
            fileSize: size
        })

        const b64Content = await downloadStateFrom(stateLocation)
        const snapshot = base64ToState(b64Content)

        overrideInvestors(snapshot.investorStore)
        overrideQuests(snapshot.questStore)
        overridePools(snapshot.poolStore)
        overrideGenerators(snapshot.generatorStore)
        overrideLogs(snapshot.logStore)

        overrideStateBySnapshot(snapshot)

        toast.current.show({
            severity: 'success',
            summary: 'Success',
            detail: `Current state was overriden by snapshot ${stateId}`
        })

        setLoaderData({ active: false })
        props.setSidebarVisible(false)
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

    const actionSaveButton = () => {
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
        <React.Fragment>
            <Loader loaderData={loaderData} />
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
                        style={{ width: '18rem' }}
                        editor={(options) => textEditor(options)}
                        onCellEditComplete={(e) => {
                            setNewStateName(e.newValue)
                        }}
                    />
                    <Column field="scenarioId" header="Scenario" />
                    <Column field="totalQuests" header="Total Quests" />
                    <Column field="totalCrossPools" header="Total CrossPools" />
                    <Column field="totalInvestors" header="Total Investors" />
                    <Column field="totalTVL" header="Total TVL" />
                    <Column field="totalMCAP" header="Total MCAP" />
                    <Column field="totalUSDC" header="Total USDC" />
                    <Column field="stateLocation" hidden />
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
                    <Column
                        field="stateId"
                        header="Name"
                        style={{ width: '18rem' }}
                        sortable
                    />
                    <Column field="scenarioId" header="Scenario" sortable />
                    <Column field="totalQuests" header="Total Quests" />
                    <Column field="totalCrossPools" header="Total CrossPools" />
                    <Column field="totalInvestors" header="Total Investors" />
                    <Column field="totalTVL" header="Total TVL" sortable />
                    <Column field="totalMCAP" header="Total MCAP" sortable />
                    <Column field="totalUSDC" header="Total USDC" sortable />
                    <Column field="stateLocation" hidden />
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
        </React.Fragment>
    )
}

const Loader = (props) => {
    if (!props.loaderData.active) {
        return
    }

    return (
        <React.Fragment>
            <div className="global-loading">
                <div className="global-loader flex w-20rem flex-column justify-content-center align-content-center">
                    <ProgressSpinner className="flex" />
                    <div className="flex align-items-center justify-content-center">
                        <span>
                            {props.loaderData.message}{' '}
                            {props.loaderData.fileSize
                                ? formatBytes(props.loaderData.fileSize)
                                : ''}
                        </span>
                    </div>
                </div>
                <div className="global-shutter"></div>
            </div>
        </React.Fragment>
    )
}