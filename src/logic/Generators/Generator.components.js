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

import { createScenario, getScenarios } from '../../api/scenarios'
import globalState from '../GlobalState'
import useInvestorStore from '../Investor/investor.store'
import useLogsStore from '../Logs/logs.store'
import usePoolStore from '../Pool/pool.store'
import useQuestStore from '../Quest/quest.store'
import {
    deleteStateInvestorConfig,
    deleteStateQuestConfig,
    updateStateInvestorConfig,
    updateStateQuestConfig
} from '../Utils/logicUtils'
import { capitalize, pushIfNotExist } from '../Utils/uiUtils'
import Generator from './Generator.class'
import { InvestorModuleComponent } from './InvestorModuleComponent'
import { QuestModuleComponent } from './QuestModuleComponent'
import useGeneratorStore from './generator.store'
import { dayData, invGen, questGen } from './initialState'

const updateInvSelector = (state) => state.updateInvConfig
const deleteInvSelector = (state) => state.deleteInvConfig

const updateQuestSelector = (state) => state.updateQuestConfig
const deleteQuestSelector = (state) => state.deleteQuestConfig

const RemoteScenarios = (props) => {
    const [lazyLoading, setLazyLoading] = useState(false)

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
            onChange={(e) => props.setScenario(e.value)}
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
    const [genDays, setGenDays] = useState(10)
    const [passedDays, setPassedDays] = useState(0)
    const [genActive, setGenActive] = useState(false)
    const [genOutput, setGenOutput] = useState({
        day: 1,
        ...dayData
    })

    const swap = usePoolStore((state) => state.swap)

    const addPool = usePoolStore((state) => state.addPool)
    const addInvestor = useInvestorStore((state) => state.addInvestor)
    const addQuest = useQuestStore((state) => state.addQuest)
    const addSwap = usePoolStore((state) => state.addSwap)
    const addLogObj = useLogsStore((state) => state.addLogObj)

    const addInvConfig = useGeneratorStore((state) => state.addInvConfig)
    const addQuestConfig = useGeneratorStore((state) => state.addQuestConfig)
    const resetInvConfigs = useGeneratorStore((state) => state.resetInvConfigs)
    const resetQuestConfigs = useGeneratorStore(
        (state) => state.resetQuestConfigs
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

            resetInvConfigs()
            currentScenario.scenario.invConfigs.forEach((invGen) => {
                addInvConfig(invGen)
                globalState.generatorStore.invConfigs.push(invGen)
            })

            resetQuestConfigs()
            currentScenario.scenario.questConfigs.forEach((questGen) => {
                addQuestConfig(questGen)
                globalState.generatorStore.questConfigs.push(questGen)
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
    ])

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
            globalState.pools.values(),
            globalState.quests.values()
        )

        // Every day
        for (let day = passedDays + 1; day <= genDays + passedDays; day++) {
            console.log(`Simulating day ${day}`)
            const stepData = await genManager.step(day)

            setGenOutput({
                ...genOutput,
                ...stepData,
                day
            })

            stepData.investors.forEach((investor) => {
                if (!globalState.investors.has(investor.hash)) {
                    globalState.investors.set(investor.hash, investor)
                    addInvestor(investor.hash)
                    pushIfNotExist(
                        globalState.investorStore.investors,
                        investor.hash
                    )
                }
            })
            stepData.quests.forEach((quest) => {
                if (!globalState.quests.has(quest.name)) {
                    globalState.quests.set(quest.name, quest)
                    addQuest(quest.name)
                    globalState.questStore.quests.push(quest.name)
                }
            })
            stepData.pools.forEach((pool) => {
                if (!globalState.pools.has(pool.name)) {
                    globalState.pools.set(pool.name, pool)
                    addPool(pool.name)
                    globalState.poolStore.pools.push(pool.name)
                }
            })
            stepData.actions.forEach((action) => {
                if (['BOUGHT', 'SOLD'].includes(action.action)) {
                    addSwap(action)
                    globalState.poolStore.swaps.push(action)
                }
                addLogObj(action)
                globalState.logStore.logObjs.push(action)
            })
            await genManager.sleep(100)
        }
        setPassedDays(passedDays + genDays)
        setGenActive(false)
    }

    return (
        <div>
            <div id="simulation-progress" className="sim-sticky">
                {genActive ? (
                    <div className="sim-content">
                        <ProgressBar
                            value={(
                                (genOutput.day - passedDays) *
                                (100 / genDays)
                            ).toFixed(1)}
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
            invGenAlias: `${capitalize(
                faker.word.adjective()
            )} ${faker.name.firstName()}`,
            invGenName: `${capitalize(
                faker.word.adjective()
            )} ${faker.name.firstName()}`
        })

        addInvConfig(newInvGen)
        globalState.generatorStore.invConfigs.push(newInvGen)
    }

    return (
        <React.Fragment>
            <Button
                label="Create Investor Template"
                icon="pi pi-plus"
                className="px-2 p-button-secondary"
                onClick={handleNewInvestorGen}
            ></Button>
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
        const newState = { ...props.state, [evt.target.id]: evt.target.value }
        props.updateInvConfig(newState)
        globalState.generatorStore.invConfigs = updateStateInvestorConfig(
            globalState.generatorStore.invConfigs,
            newState
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
            questGenAlias: `${capitalize(faker.word.adjective())} ${
                faker.science.chemicalElement().name
            }`,
            questGenName: `${capitalize(faker.word.adjective())} ${
                faker.science.chemicalElement().name
            }`
        })
        addQuestConfig(newQuestGen)
        globalState.generatorStore.questConfigs.push(newQuestGen)
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
        const newState = { ...props.state, [evt.target.id]: evt.target.value }
        props.updateQuestConfig(newState)
        globalState.generatorStore.questConfigs = updateStateQuestConfig(
            globalState.generatorStore.questConfigs,
            newState
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
            quests={quests}
        />
    )
}
