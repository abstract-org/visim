import { FilterMatchMode } from 'primereact/api'
import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Divider } from 'primereact/divider'
import { Dropdown } from 'primereact/dropdown'
import { Fieldset } from 'primereact/fieldset'
import { InputText } from 'primereact/inputtext'
import { ProgressSpinner } from 'primereact/progressspinner'
import { Sidebar } from 'primereact/sidebar'
import { Toast } from 'primereact/toast'
import { Tooltip } from 'primereact/tooltip'
import React, { useEffect, useRef, useState } from 'react'

import { getPresignedUrl } from '../../api/s3'
import StorageApi from '../../api/states'
import useExpertModeStore from '../../stores/expertMode.store'
import useGeneratorStore from '../Generators/generator.store'
import globalState from '../GlobalState'
import useInvestorStore from '../Investor/investor.store'
import useLogsStore from '../Logs/logs.store'
import usePoolStore from '../Pool/pool.store'
import useQuestStore from '../Quest/quest.store'
import { useSupabaseAuth } from '../Supabase/Supabase.components'
import {
    fetchSnapshotById,
    fetchTotalsList
} from '../Supabase/Supabase.download-service'
import { aggregateAndStoreDataForSnapshot } from '../Supabase/Supabase.service'
import { formatBytes } from '../Utils/logicUtils'
import useDayTrackerStore from '../dayTracker.store'
import { downloadStateFrom, getContentLength } from './download.service'
import {
    aggregateSnapshotTotals,
    base64ToState,
    overrideStateBySnapshot,
    sanitizeSnapshot,
    validateState
} from './states.service'
import { uploadStateTo } from './upload.service'

const overrideSelector = (state) => state.override

const nf = new Intl.NumberFormat('en-US')

export const StatesSidebar = (props) => {
    return (
        <Sidebar
            visible={props.isVisible}
            position="left"
            dismissable
            closeOnEscape
            onHide={() => props.setVisible(false)}
            modal={true}
        >
            <h1>States</h1>
            <StatesTable setSidebarVisible={props.setVisible} />
        </Sidebar>
    )
}

function generateCurrentStateId() {
    return `@${new Date().getTime()}`
}

const StatesTable = (props) => {
    const { user } = useSupabaseAuth()
    const quests = useQuestStore((state) => state.quests)
    const pools = usePoolStore((state) => state.pools)
    const scenarioId = useGeneratorStore((state) => state.scenarioId)
    const overrideLogs = useLogsStore(overrideSelector)
    const overrideQuests = useQuestStore(overrideSelector)
    const overridePools = usePoolStore(overrideSelector)
    const overrideGenerators = useGeneratorStore(overrideSelector)
    const overrideInvestors = useInvestorStore(overrideSelector)
    const overrideDayTracker = useDayTrackerStore(overrideSelector)
    const incrementDay = useDayTrackerStore((state) => state.incrementDay)
    const setNeedScrollUp = useGeneratorStore((state) => state.setNeedScrollUp)
    const [snapshots, setSnapshots] = useState([])
    const [dbSnapshots, setDbSnapshots] = useState([])
    const [dbCreators, setDbCreators] = useState([])
    const [currentStateInfo, setCurrentStateInfo] = useState({})
    const isMounted = useRef(null)
    const [loaderData, setLoaderData] = useState({
        fileSize: 0,
        active: false,
        message: ''
    })
    const [newStateName, setNewStateName] = useState('')
    const toast = useRef(null)
    const isExpert = useExpertModeStore((state) => state.isExpert)

    const saveStateToDb = async () => {
        try {
            const stateId = generateCurrentStateId()

            setLoaderData({
                active: true,
                message: 'Saving current state to DB'
            })
            incrementDay() // finishing day for UI and trigger creating updates in state.historical
            await aggregateAndStoreDataForSnapshot({
                stateId,
                stateName: newStateName,
                state: globalState,
                creatorId: user.id
            })
            // set new day counter in globalState only after saving current state data
            // so that new empty day not saved in DB yet
            globalState.dayTrackerStore.currentDay++

            toast.current.show({
                severity: 'success',
                summary: 'Success',
                detail: `Current state saved to DB`
            })

            setLoaderData({ active: false })
            await handleDbStatesLoaded()
        } catch (e) {
            toast.current.show({
                severity: 'error',
                summary: 'Error',
                detail: e.message
            })
        }
    }

    const saveCurrentState = async () => {
        const stateId = generateCurrentStateId()
        const stateDetails = aggregateSnapshotTotals({
            stateId,
            stateName: newStateName,
            state: globalState,
            scenarioId
        })
        setNewStateName(stateDetails.stateName)

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
            strippedStateLocation
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
        await handleStatesLoaded()
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
        fetchTotalsList()
            .then((res) => {
                setDbSnapshots(res.snapshots)
                setDbCreators(res.creators)
            })
            .catch((err) => {
                console.log(err)
            })
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const currentStateDetails = aggregateSnapshotTotals({
            stateName: newStateName,
            scenarioId,
            state: globalState
        })
        setCurrentStateInfo(currentStateDetails)
        setNewStateName(currentStateDetails.stateName)
    }, [quests, pools, scenarioId, newStateName])

    const handleStatesLoaded = async () => {
        const snapshotsLoaded = await StorageApi.getStates()

        updateSnapshots(snapshotsLoaded)
    }

    const handleDbStatesLoaded = async () => {
        const { snapshots, creators } = await fetchTotalsList()
        setDbSnapshots(snapshots)
        setDbCreators(creators)
    }

    const loadState = async ({ stateId, stateLocation }) => {
        const size = await getContentLength(stateLocation)
        setLoaderData({
            active: true,
            message: 'Downloading state',
            fileSize: size
        })

        const b64Content = await downloadStateFrom(stateLocation)
        const snapshot = sanitizeSnapshot(base64ToState(b64Content))

        overrideInvestors(snapshot.investorStore)
        overrideQuests(snapshot.questStore)
        overridePools(snapshot.poolStore)
        overrideGenerators(snapshot.generatorStore)
        overrideLogs(snapshot.logStore)
        overrideDayTracker(snapshot.dayTrackerStore)

        overrideStateBySnapshot(snapshot)

        toast.current.show({
            severity: 'success',
            summary: 'Success',
            detail: `Current state was overriden by snapshot ${stateId}`
        })

        setLoaderData({ active: false })
        setNeedScrollUp(true)
        props.setSidebarVisible(false)
    }

    const stateNameEditor = () => {
        return user || isExpert ? (
            <InputText
                type="text"
                value={newStateName}
                onChange={(e) => setNewStateName(e.target.value)}
            />
        ) : (
            <span>{newStateName}</span>
        )
    }

    const loadFromDb = async (snapshotId, snapshotName) => {
        setLoaderData({
            active: true,
            message: `Downloading snapshot [${snapshotName}] from DB`,
            fileSize: 0
        })

        let newState = null
        try {
            newState = await fetchSnapshotById(snapshotId)
            console.debug(`New state [${snapshotId}] =`, newState)
        } catch (err) {}

        if (!newState) {
            toast.current.show({
                severity: 'error',
                summary: 'Error',
                detail: `Couldn't download snapshot from DB`
            })
            setLoaderData({ active: false })

            return
        }

        const validationResult = validateState(newState)
        if (!validationResult.isValid) {
            console.debug('State is not valid!', validationResult.errors)
        } else {
            console.debug('State is valid.')
        }

        overrideInvestors(newState.investorStore)
        overrideQuests(newState.questStore)
        overridePools(newState.poolStore)
        overrideGenerators(newState.generatorStore)
        overrideLogs(newState.logStore)
        overrideDayTracker(newState.dayTrackerStore)

        overrideStateBySnapshot(newState)

        toast.current.show({
            severity: 'success',
            summary: 'Success',
            detail: `Current state was overridden by snapshot ${snapshotId}`
        })

        setLoaderData({ active: false })
        setNeedScrollUp(true)
        props.setSidebarVisible(false)
    }

    const actionSaveButton = () => {
        return (
            <div className="flex flex-column gap-2">
                {isExpert && (
                    <Button
                        icon="pi pi-save"
                        iconPos="left"
                        label={`Save state`}
                        className="p-button-success mr-2"
                        onClick={saveCurrentState}
                    />
                )}
                {user ? (
                    <Button
                        icon="pi pi-save"
                        iconPos="left"
                        label={`Save to DB`}
                        className="p-button-success mr-2"
                        onClick={saveStateToDb}
                    />
                ) : (
                    <span style={{ fontWeight: 'bold', color: 'red' }}>
                        Sign-in to enable
                        <br /> saving to DB
                    </span>
                )}
            </div>
        )
    }

    const stateNameBody = (rowData, { field }) => {
        return (
            <div className="state-name-cell" data-pr-tooltip={rowData.stateId}>
                {rowData[field]}
                <Tooltip
                    target=".state-name-cell"
                    position="bottom"
                    mouseTrack
                    mouseTrackLeft={10}
                />
            </div>
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

    const actionLoadFromDbButton = (rowData) => {
        return (
            <React.Fragment>
                <Button
                    icon="pi pi-database"
                    iconPos="left"
                    label="Load from DB"
                    className="p-button-danger mr-2"
                    onClick={() => loadFromDb(rowData.id, rowData.seed)}
                />
            </React.Fragment>
        )
    }

    const dateFormatter = (rowData, { field }) => {
        return (
            <span>
                {new Date(rowData[field]).toDateString() +
                    ' ' +
                    new Date(rowData[field]).toLocaleTimeString()}
            </span>
        )
    }

    const numberFormatter = (rowData, { field }) => {
        return <span>{nf.format(rowData[field])}</span>
    }

    const creatorEmailFilterTemplate = (options) => {
        return (
            <Dropdown
                value={{ email: options.value }}
                options={dbCreators}
                itemTemplate={(option) => {
                    return (
                        <div className="p-multiselect-creator-email-option">
                            <p>{option.email}</p>
                        </div>
                    )
                }}
                onChange={(e) => {
                    options.filterCallback(e.value.email)
                }}
                optionLabel="email"
                placeholder="Creator Email"
                className="p-column-filter"
            />
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
                    size="small"
                >
                    <Column
                        key="seed"
                        field="stateName"
                        frozen={true}
                        header="Name"
                        style={{ width: '18rem' }}
                        body={stateNameEditor}
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
                        body={dateFormatter}
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
                legend="SQL State"
                toggleable
                collapsed={false}
                onExpand={handleDbStatesLoaded}
            >
                <DataTable
                    value={dbSnapshots}
                    selectionMode="single"
                    sortField="created_at"
                    sortOrder={-1}
                    paginator
                    rows={10}
                    size="small"
                    globalFilterFields={['creator_email']}
                    filterDisplay="menu"
                    filters={{
                        creator_email: {
                            value: null,
                            matchMode: FilterMatchMode.EQUALS
                        }
                    }}
                >
                    <Column
                        field="seed"
                        header="Name"
                        style={{ width: '18rem' }}
                        sortable
                    />
                    <Column
                        field="creator_email"
                        header="Creator"
                        sortable
                        filter
                        showFilterMatchModes={false}
                        filterElement={creatorEmailFilterTemplate}
                    />
                    <Column field="scenario_id" header="Scenario" sortable />
                    <Column field="quests" header="Total Quests" />
                    <Column field="cross_pools" header="Total CrossPools" />
                    <Column field="investors" header="Total Investors" />
                    <Column
                        field="tvl"
                        header="Total TVL"
                        body={numberFormatter}
                        sortable
                    />
                    <Column
                        field="mcap"
                        header="Total MCAP"
                        body={numberFormatter}
                        sortable
                    />
                    <Column
                        field="usdc"
                        header="Total USDC"
                        body={numberFormatter}
                        sortable
                    />
                    <Column
                        field="created_at"
                        header="Execution Date"
                        body={dateFormatter}
                        sortable
                    />

                    <Column
                        body={actionLoadFromDbButton}
                        exportable={false}
                        style={{ minWidth: '8rem' }}
                    />
                </DataTable>
            </Fieldset>

            {isExpert && (
                <Fieldset
                    legend="Remote states"
                    toggleable
                    collapsed={true}
                    onExpand={handleStatesLoaded}
                >
                    <DataTable
                        value={snapshots}
                        selectionMode="single"
                        sortField="executionDate"
                        sortOrder={-1}
                        paginator
                        rows={10}
                        size="small"
                    >
                        <Column
                            field="stateName"
                            header="Name"
                            body={stateNameBody}
                            style={{ width: '18rem' }}
                            sortable
                        />
                        <Column field="scenarioId" header="Scenario" sortable />
                        <Column field="totalQuests" header="Total Quests" />
                        <Column
                            field="totalCrossPools"
                            header="Total CrossPools"
                        />
                        <Column
                            field="totalInvestors"
                            header="Total Investors"
                        />
                        <Column field="totalTVL" header="Total TVL" sortable />
                        <Column
                            field="totalMCAP"
                            header="Total MCAP"
                            sortable
                        />
                        <Column
                            field="totalUSDC"
                            header="Total USDC"
                            sortable
                        />
                        <Column field="stateLocation" hidden />
                        <Column
                            field="executionDate"
                            header="Execution Date"
                            body={dateFormatter}
                            sortable
                        />

                        <Column
                            body={actionLoadButton}
                            exportable={false}
                            style={{ minWidth: '8rem' }}
                        />
                    </DataTable>
                </Fieldset>
            )}
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
                <div className="global-loader flex w-30rem flex-column justify-content-center align-content-center">
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
                <div className="global-shutter" />
            </div>
        </React.Fragment>
    )
}
