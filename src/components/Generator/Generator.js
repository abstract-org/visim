import { faker } from '@faker-js/faker'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { Divider } from 'primereact/divider'
import { Dropdown } from 'primereact/dropdown'
import { InputNumber } from 'primereact/inputnumber'
import { InputText } from 'primereact/inputtext'
import { ProgressBar } from 'primereact/progressbar'
import { Skeleton } from 'primereact/skeleton'
import { Toast } from 'primereact/toast'
import React, { useEffect, useRef, useState } from 'react'

import globalState from '../../GlobalState'
import { createScenario, getScenarios } from '../../services/api/scenarios'
import Generator from '../../services/generator/Generator.class'
import useDayTrackerStore from '../../stores/dayTracker.store'
import useGeneratorStore from '../../stores/generator.store'
import useInvestorStore from '../../stores/investor.store'
import useLogsStore from '../../stores/logs.store'
import usePoolStore from '../../stores/pool.store'
import usePositionConfigStore from '../../stores/positionConfig.store'
import useQuestStore from '../../stores/quest.store'
import {
    deleteStateInvestorConfig,
    deleteStateQuestConfig,
    updateStateInvestorConfig,
    updateStateQuestConfig
} from '../../utils/storeUtils'
import { getMissingQuestNames, isNumericString } from '../../utils/uiUtils'
import { InvestorModuleComponent } from '../InvestorModuleComponent'
import { QuestModuleComponent } from '../QuestModuleComponent'
import { dayData, invGen, questGen } from './initialState'

const updateInvSelector = (state) => state.updateInvConfig
const deleteInvSelector = (state) => state.deleteInvConfig

const updateQuestSelector = (state) => state.updateQuestConfig
const deleteQuestSelector = (state) => state.deleteQuestConfig

const RemoteScenarios = (props) => {
    const [lazyLoading, setLazyLoading] = useState(false)
    const getEnabledPositions = usePositionConfigStore(
        (state) => state.getEnabledPositions
    )

    let dropdownScenarios = []
    if (props.scenarios) {
        dropdownScenarios = props.scenarios.map((sc) => ({
            label: sc.scenarioId,
            value: sc.scenarioId
        }))
    }

    useEffect(() => {
        setLazyLoading(false)
    }, [])

    const onLazyLoad = async (event) => {
        setLazyLoading(true)

        const scenarios = await getScenarios()
        if (scenarios) {
            props.setScenario(null)
            props.setScenarios(scenarios)
        }
        setLazyLoading(false)
    }

    return (
        <Dropdown
            id={props.scenario}
            value={props.scenario}
            options={dropdownScenarios}
            onChange={(e) =>
                props.handleSelectScenario(e.value, getEnabledPositions)
            }
            placeholder="Load Scenario"
            className="w-15rem"
            virtualScrollerOptions={{
                lazy: true,
                onLazyLoad: onLazyLoad,
                itemSize: 17,
                showLoader: true,
                loading: lazyLoading,
                delay: 250,
                loadingTemplate: (options) => {
                    return (
                        <div className="flex align-items-center p-2">
                            <Skeleton width={options.even ? '60%' : '50%'} />
                        </div>
                    )
                }
            }}
        />
    )
}

const NewScenario = (props) => {
    return (
        <React.Fragment>
            <InputText
                placeholder="Name Scenario"
                className="w-15rem"
                value={props.newScenarioName}
                onChange={(e) => props.setNewScenarioName(e.target.value)}
            />
            <Button
                icon="pi pi-save"
                className="ml-2 w-3rem h-3rem p-button-success"
                onClick={props.handleNewScenario}
            />
        </React.Fragment>
    )
}

export const GeneratorRunner = () => {
    const invConfigs = useGeneratorStore((state) => state.invConfigs)
    const questConfigs = useGeneratorStore((state) => state.questConfigs)
    const setScenarioId = useGeneratorStore((state) => state.setScenarioId)
    const currentDay = useDayTrackerStore((state) => state.currentDay)

    const [genDays, setGenDays] = useState(10)
    const [passedDays, setPassedDays] = useState(0)
    const [genActive, setGenActive] = useState(false)
    const [genOutput, setGenOutput] = useState({
        day: currentDay,
        ...dayData
    })

    const swaps = usePoolStore((state) => state.swaps)

    const addPool = usePoolStore((state) => state.addPool)
    const addMultiplePools = usePoolStore((state) => state.addMultiplePools)
    const activeInvestor = useInvestorStore((state) => state.active)
    const addMultipleInvestors = useInvestorStore(
        (state) => state.addMultipleInvestors
    )
    const addHumanQuest = useQuestStore((state) => state.addHumanQuest)
    const addQuest = useQuestStore((state) => state.addQuest)
    const addMultipleQuests = useQuestStore((state) => state.addMultipleQuests)
    const addMultipleSwaps = usePoolStore((state) => state.addMultipleSwaps)
    const overrideSwaps = useLogsStore((state) => state.overrideSwaps)
    const incrementDay = useDayTrackerStore((state) => state.incrementDay)

    const addInvConfig = useGeneratorStore((state) => state.addInvConfig)
    const addQuestConfig = useGeneratorStore((state) => state.addQuestConfig)
    const resetInvConfigs = useGeneratorStore((state) => state.resetInvConfigs)
    const resetQuestConfigs = useGeneratorStore(
        (state) => state.resetQuestConfigs
    )
    const getEnabledPositions = usePositionConfigStore(
        (state) => state.getEnabledPositions
    )

    const [scenarios, setScenarios] = useState([])
    const [scenario, setScenario] = useState('')
    const [newScenarioName, setNewScenarioName] = useState('')

    const toast = useRef(null)

    useEffect(() => {
        if (scenario) {
            const currentScenario = scenarios.find(
                (sc) => sc.scenarioId === scenario
            )

            globalState.generatorStore = { invConfigs: [], questConfigs: [] }

            resetInvConfigs()
            currentScenario.scenario.invConfigs.forEach((invGenItem) => {
                addInvConfig(invGenItem)
                globalState.generatorStore.invConfigs.push(invGenItem)
            })

            resetQuestConfigs()
            currentScenario.scenario.questConfigs.forEach((questGenItem) => {
                addQuestConfig(questGenItem)
                globalState.generatorStore.questConfigs.push(questGenItem)
            })

            setScenarioId(currentScenario.scenarioId)
        }
    }, [
        addInvConfig,
        resetInvConfigs,
        addQuestConfig,
        resetQuestConfigs,
        scenario,
        scenarios,
        setScenarioId
        // currentDay
    ])

    const handleSelectScenario = (scenarioId) => {
        const scenarioObj = scenarios.find((sc) => sc.scenarioId === scenarioId)
        const missingQuests = getMissingQuestNames(scenarioObj.scenario)

        if (activeInvestor && missingQuests.length > 0) {
            const investor = globalState.investors.get(activeInvestor)
            missingQuests.forEach((qName) => {
                const quest = investor.createQuest(qName)
                const pool = quest.createPool({
                    initialPositions: getEnabledPositions()
                })

                const usdcQuest = globalState.quests.get(pool.tokenLeft)
                usdcQuest.addPool(pool)
                globalState.quests.get(usdcQuest.name, usdcQuest)

                globalState.quests.set(quest.name, quest)
                globalState.pools.set(pool.name, pool)

                // Add Quest to state
                addQuest(quest.name)
                // Add Quest to global state store
                globalState.questStore.quests.push(quest.name)
                // Mark Quest as human-made
                addHumanQuest(quest.name)
                // Add human-made mark to global state
                globalState.questStore.humanQuests.push(quest.name)
                // Add Pool to state
                addPool(pool.name)
                // Add Pool to global state of pool store
                globalState.poolStore.pools.push(pool.name)
            })
        }

        setScenario(scenarioId)
    }

    const handleNewScenario = async () => {
        toast.current.clear()

        if (!invConfigs.length) {
            console.log('You need to create at least one investor template')
            toast.current.show({
                severity: 'error',
                detail: 'You need to create at least one investor template',
                life: 2000
            })
            return
        }

        if (!newScenarioName) {
            console.log('You need to provide a name for your scenario')
            toast.current.show({
                severity: 'error',
                detail: 'You need to provide a name for your scenario',
                life: 2000
            })
            return
        }

        const response = await createScenario(
            newScenarioName,
            invConfigs,
            questConfigs
        )

        if (response.status === 201) {
            setScenarioId(newScenarioName)
            toast.current.show({
                severity: 'success',
                detail: response.body,
                life: 2000
            })
        } else {
            toast.current.show({
                severity: 'error',
                detail: response.body,
                life: 2000
            })
            return
        }

        setNewScenarioName('')
    }

    function storeStepData(stepData) {
        stepData.investors.forEach((investor) => {
            if (!globalState.investors.has(investor.hash)) {
                globalState.investors.set(investor.hash, investor)
                globalState.investorStore.investors.push(investor.hash)
            }
        })
        addMultipleInvestors(stepData.investors.map((i) => i.hash))

        stepData.quests.forEach((quest) => {
            if (!globalState.quests.has(quest.name)) {
                globalState.quests.set(quest.name, quest)
                globalState.questStore.quests.push(quest.name)
            }
        })
        addMultipleQuests(stepData.quests.map((q) => q.name))

        const newPoolNames = stepData.pools
            .map((pool) => {
                if (!globalState.pools.has(pool.name)) {
                    globalState.pools.set(pool.name, pool)

                    return pool.name
                }

                return null
            })
            .filter((pName) => pName)
        addMultiplePools(newPoolNames)
        globalState.poolStore.pools.push(...newPoolNames)

        const boughtSoldArr = ['BOUGHT', 'SOLD']
        stepData.actions.forEach((action) => {
            if (boughtSoldArr.includes(action.action)) {
                globalState.poolStore.swaps.push(action)
            }
            globalState.logStore.logObjs.push(action)
        })

        overrideSwaps(globalState.logStore.logObjs)
        addMultipleSwaps(
            stepData.actions.filter((a) => boughtSoldArr.includes(a.action))
        )
    }

    const handleGenerate = async () => {
        if (genDays <= 0) {
            console.log('Specify amount of days to simulate')
            return
        }

        if (invConfigs.length <= 0) {
            console.log(
                'Please create generator configs with investor module first'
            )
            return
        }

        setGenActive(true)

        const genManager = new Generator(
            invConfigs,
            questConfigs,
            globalState.pools,
            globalState.quests,
            globalState.investors,
            swaps,
            getEnabledPositions
        )

        let day = currentDay + 1
        incrementDay()
        globalState.dayTrackerStore.currentDay++
        const simulationLastDay = day + genDays
        // Every day
        while (day < simulationLastDay) {
            console.log(`\n\nSimulating day ${day}\n\n`)
            const stepData = await genManager.step(day)

            setGenOutput({
                ...genOutput,
                ...stepData,
                day
            })

            storeStepData(stepData)
            incrementDay()
            globalState.dayTrackerStore.currentDay++
            day++

            await genManager.sleep(50)
        }
        setPassedDays(simulationLastDay)
        setGenActive(false)
    }

    return (
        <div>
            <div id="simulation-progress" className="sim-sticky">
                {genActive ? (
                    <div className="sim-content">
                        <ProgressBar
                            value={
                                (genOutput.day - passedDays) * (100 / genDays)
                            }
                            displayValueTemplate={(value) => (
                                <React.Fragment>
                                    {(value * genDays) / 100}/{genDays} days
                                </React.Fragment>
                            )}
                            className="w-12 flex align-self-center"
                        />
                    </div>
                ) : (
                    ''
                )}
            </div>
            <div className="grid">
                <div className="col-12">
                    <Card className="h-full">
                        <div className="grid">
                            <div className="col-12">
                                <div className="flex justify-content-between flex-wrap">
                                    <div className="flex flex-grow-1">
                                        <h2 className="m-0">
                                            Random Generator
                                        </h2>
                                    </div>
                                    <Toast ref={toast} />
                                    <div className="flex flex-grow-0 mr-3">
                                        <NewScenario
                                            newScenarioName={newScenarioName}
                                            setNewScenarioName={
                                                setNewScenarioName
                                            }
                                            handleNewScenario={
                                                handleNewScenario
                                            }
                                        />
                                    </div>
                                    <div className="flex flex-grow-0 mr-3">
                                        <RemoteScenarios
                                            scenario={scenario}
                                            scenarios={scenarios}
                                            setScenario={setScenario}
                                            setScenarios={setScenarios}
                                            handleSelectScenario={
                                                handleSelectScenario
                                            }
                                        />
                                    </div>

                                    <div className="flex flex-grow-0 mr-3">
                                        <Button
                                            label="Generate"
                                            onClick={handleGenerate}
                                            loading={genActive}
                                        />
                                    </div>
                                    <div className="flex flex-grow-0 w-1">
                                        <div className="p-inputgroup">
                                            <span className="p-inputgroup-addon">
                                                Days
                                            </span>
                                            <InputNumber
                                                placeholder="10"
                                                value={genDays}
                                                onChange={(e) =>
                                                    setGenDays(e.value)
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid">
                            <div className="col-12">
                                <InvestorRandomGenerator />
                            </div>
                        </div>
                        <div className="grid">
                            <Divider />
                        </div>
                        <div className="grid">
                            <div className="col-12">
                                <QuestRandomGenerator />
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export const InvestorRandomGenerator = () => {
    const invConfigs = useGeneratorStore((state) => state.invConfigs)
    const addInvConfig = useGeneratorStore((state) => state.addInvConfig)
    const updateInvConfig = useGeneratorStore(updateInvSelector)
    const deleteInvConfig = useGeneratorStore(deleteInvSelector)

    const handleNewInvestorGen = () => {
        if (invConfigs.length >= 4) {
            return
        }

        const newInvGen = Object.assign(invGen, {
            invGenAlias: `${faker.name.firstName()}`,
            invGenName: `${faker.name.firstName()}`
        })

        addInvConfig(newInvGen)
        const cloned = JSON.parse(JSON.stringify(newInvGen))
        globalState.generatorStore.invConfigs.push(cloned)
    }

    return (
        <React.Fragment>
            <Button
                label="Create Investor Template"
                icon="pi pi-plus"
                className="px-2 p-button-secondary"
                onClick={handleNewInvestorGen}
            />
            <div className="gen-wrapper flex flex-row flex-nowrap justify-content-start">
                {invConfigs.map((gen) => {
                    return (
                        <GenCardInvestor
                            updateInvConfig={updateInvConfig}
                            deleteInvConfig={deleteInvConfig}
                            state={gen}
                            key={gen.invGenAlias}
                        />
                    )
                })}
            </div>
        </React.Fragment>
    )
}

export const GenCardInvestor = (props) => {
    const questConfigs = useGeneratorStore((state) => state.questConfigs)
    const quests = useQuestStore((state) => state.quests)

    const handleChange = (evt) => {
        if (
            evt.target.id === 'invGenName' &&
            isNumericString(evt.target.value)
        ) {
            return
        }
        const targetValue =
            evt.target.type === 'number'
                ? Number(evt.target.value)
                : evt.target.value
        const newValue = targetValue != null ? targetValue : evt.target.checked
        const newState = { ...props.state, [evt.target.id]: newValue }
        props.updateInvConfig(newState)
        globalState.generatorStore.invConfigs = updateStateInvestorConfig(
            globalState.generatorStore.invConfigs,
            newState
        )
    }

    const handleChangeExpert = (strState) => {
        let objState
        try {
            objState = JSON.parse(strState)
        } catch (e) {
            return
        }

        props.updateInvConfig(objState)
        globalState.generatorStore.invConfigs = updateStateInvestorConfig(
            globalState.generatorStore.invConfigs,
            objState
        )
    }

    const handleDelete = (invGenAlias) => {
        props.deleteInvConfig(invGenAlias)
        globalState.generatorStore.invConfigs = deleteStateInvestorConfig(
            globalState.generatorStore.invConfigs,
            invGenAlias
        )
    }

    return (
        <InvestorModuleComponent
            state={props.state}
            handleChange={handleChange}
            handleDelete={handleDelete}
            handleChangeExpert={handleChangeExpert}
            questConfigs={questConfigs}
            quests={quests}
        />
    )
}

export const QuestRandomGenerator = () => {
    const questConfigs = useGeneratorStore((state) => state.questConfigs)
    const addQuestConfig = useGeneratorStore((state) => state.addQuestConfig)
    const updateQuestConfig = useGeneratorStore(updateQuestSelector)
    const deleteQuestConfig = useGeneratorStore(deleteQuestSelector)

    const handleNewQuestGen = () => {
        if (questConfigs.length >= 4) {
            return
        }

        const newQuestGen = Object.assign(questGen, {
            questGenAlias: `${faker.science.chemicalElement().name}`,
            questGenName: `${faker.science.chemicalElement().name}`
        })
        addQuestConfig(newQuestGen)
        const cloned = JSON.parse(JSON.stringify(newQuestGen))
        globalState.generatorStore.questConfigs.push(cloned)
    }

    return (
        <React.Fragment>
            <Button
                label="Create Quest"
                icon="pi pi-plus"
                className="px-2 p-button-secondary"
                onClick={handleNewQuestGen}
            ></Button>
            <div className="gen-wrapper flex flex-row flex-nowrap justify-content-start">
                {questConfigs.map((gen) => {
                    return (
                        <GenCardQuest
                            updateQuestConfig={updateQuestConfig}
                            deleteQuestConfig={deleteQuestConfig}
                            state={gen}
                            key={gen.questGenAlias}
                        />
                    )
                })}
            </div>
        </React.Fragment>
    )
}

export const GenCardQuest = (props) => {
    const quests = useQuestStore((state) => state.quests)

    const handleChange = (evt) => {
        if (
            evt.target.id === 'questGenName' &&
            isNumericString(evt.target.value)
        ) {
            return
        }
        const targetValue =
            evt.target.type === 'number'
                ? Number(evt.target.value)
                : evt.target.value
        const newValue = targetValue != null ? targetValue : evt.target.checked
        const newState = { ...props.state, [evt.target.id]: newValue }
        props.updateQuestConfig(newState)
        globalState.generatorStore.questConfigs = updateStateQuestConfig(
            globalState.generatorStore.questConfigs,
            newState
        )
    }

    const handleChangeExpert = (strState) => {
        let objState
        try {
            objState = JSON.parse(strState)
            console.log(objState)
        } catch (e) {
            return
        }

        props.updateQuestConfig(objState)
        globalState.generatorStore.questConfigs = updateStateQuestConfig(
            globalState.generatorStore.questConfigs,
            objState
        )
    }

    const handleDelete = (id) => {
        props.deleteQuestConfig(id)
        globalState.generatorStore.questConfigs = deleteStateQuestConfig(
            globalState.generatorStore.questConfigs,
            id
        )
    }

    return (
        <QuestModuleComponent
            state={props.state}
            handleChange={handleChange}
            handleDelete={handleDelete}
            handleChangeExpert={handleChangeExpert}
            quests={quests}
        />
    )
}
