import { faker } from '@faker-js/faker'
import { BlockUI } from 'primereact/blockui'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { Divider } from 'primereact/divider'
import { Dropdown } from 'primereact/dropdown'
import { Inplace, InplaceContent, InplaceDisplay } from 'primereact/inplace'
import { InputNumber } from 'primereact/inputnumber'
import { InputText } from 'primereact/inputtext'
import { Message } from 'primereact/message'
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
import { capitalize } from '../Utils/uiUtils'
import Generator from './Generator.class'
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
    const [genDays, setGenDays] = useState(10)
    const [passedDays, setPassedDays] = useState(0)
    const [genActive, setGenActive] = useState(false)
    const [genOutput, setGenOutput] = useState({
        day: 1,
        ...dayData
    })

    const addPool = usePoolStore((state) => state.addPool)
    const addInvestor = useInvestorStore((state) => state.addInvestor)
    const addQuest = useQuestStore((state) => state.addQuest)
    const swap = usePoolStore((state) => state.swap)
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
            })

            resetQuestConfigs()
            currentScenario.scenario.questConfigs.forEach((questGen) => {
                addQuestConfig(questGen)
            })
        }
    }, [
        addInvConfig,
        resetInvConfigs,
        addQuestConfig,
        resetQuestConfigs,
        scenario,
        scenarios
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
                }
            })
            stepData.actions.forEach((action) => {
                if (['BOUGHT', 'SOLD'].includes(action.action)) {
                    swap(action)
                }
                addLogObj(action)
                globalState.logs.push(action)
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
    const aliasAlert = useRef(null)
    const questConfigs = useGeneratorStore((state) => state.questConfigs)
    const quests = useQuestStore((state) => state.quests)

    const defaultOptions = [
        {
            label: 'Select Template',
            value: ''
        }
    ]
    const questOptions = questConfigs.map((gen) => ({
        label: `#${gen.questGenName}`,
        value: gen.questGenAlias
    }))
    const dropdownOptions = Array.prototype.concat(defaultOptions, questOptions)

    const defaultOption = [{ label: 'Select Quest', value: '' }]
    const dropdownQuests = quests.map((quest) => ({
        label: quest,
        value: quest
    }))
    const dropdownQuestsOptions = Array.prototype.concat(
        defaultOption,
        dropdownQuests
    )

    const handleChange = (evt) => {
        const newState = { ...props.state, [evt.target.id]: evt.target.value }
        props.updateInvConfig(newState)
    }

    const handleDelete = (invGenAlias) => {
        props.deleteInvConfig(invGenAlias)
    }

    return (
        <div className="flex flex-column gen-card">
            <div className="header flex">
                <div className="flex flex-grow-1">
                    <span className="inplace-static-text">Investor -</span>
                    <div className="flex flex-grow-none">
                        <InPlaceElement
                            id="invGenName"
                            active={true}
                            type="text"
                            component="input"
                            handleChange={handleChange}
                            state={props.state}
                            style={{ width: '14rem' }}
                        />
                    </div>
                    <div className="flex flex-grow-1 justify-content-end">
                        <Message
                            className="alias-alert"
                            severity="error"
                            text="Alias is required"
                            ref={aliasAlert}
                            style={{ display: 'none' }}
                        />
                        <div className="mr-3"></div>
                        <Button
                            icon="pi pi-trash"
                            className="w-2rem h-2rem p-button-danger"
                            onClick={() =>
                                handleDelete(props.state.invGenAlias)
                            }
                        />
                    </div>
                </div>
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    Daily probability to spawn
                </span>
                <InPlaceElement
                    id="dailySpawnProbability"
                    active={false}
                    display={`${props.state.dailySpawnProbability}%`}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={props.state}
                />
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    USDC Initial Balance
                </span>
                <InPlaceElement
                    id="initialBalance"
                    active={false}
                    display={props.state.initialBalance}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={props.state}
                />
            </div>
            <hr className="dashed-divider" />
            <div className="column flex">
                <span className="inplace-static-text">Every</span>
                <InPlaceElement
                    id="buySellPeriodDays"
                    active={false}
                    display={props.state.buySellPeriodDays}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={props.state}
                />
                <span className="inplace-static-text">days:</span>
            </div>
            <div className="column flex">
                <BlockUI
                    blocked={props.state.buySellPeriodDays <= 0}
                    className="flex w-full"
                >
                    <span className="inplace-static-text">Buys using</span>
                    <InPlaceElement
                        id="buySinglePerc"
                        active={false}
                        display={`${props.state.buySinglePerc}%`}
                        type="number"
                        component="input"
                        handleChange={handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">
                        of their balance in
                    </span>

                    <InPlaceElement
                        id="includeSingleName"
                        active={true}
                        display={props.state.includeSingleName}
                        component="dropdown"
                        options={dropdownQuestsOptions}
                        handleChange={handleChange}
                        state={props.state}
                    />
                </BlockUI>
            </div>
            <div className="column flex mt-2">
                <BlockUI
                    blocked={props.state.buySellPeriodDays <= 0}
                    className="flex w-full"
                >
                    <span className="inplace-static-text">Buys using</span>
                    <InPlaceElement
                        id="buySumPerc"
                        active={false}
                        display={`${props.state.buySumPerc}%`}
                        type="number"
                        component="input"
                        handleChange={handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">
                        of their balance in
                    </span>

                    <InPlaceElement
                        id="buyQuestPerc"
                        active={false}
                        display={`${props.state.buyQuestPerc}%`}
                        type="number"
                        component="input"
                        handleChange={handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">
                        quests that are top
                    </span>

                    <InPlaceElement
                        id="buyGainerPerc"
                        active={false}
                        display={`${props.state.buyGainerPerc}%`}
                        type="number"
                        component="input"
                        handleChange={handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">
                        gainers (up to 30 days)
                    </span>
                </BlockUI>
            </div>
            <div className="column flex">
                <BlockUI
                    blocked={props.state.buySellPeriodDays <= 0}
                    className="flex w-full"
                >
                    <span className="inplace-static-text">
                        Exclude quest from direct investment:
                    </span>
                    <InPlaceElement
                        id="excludeSingleName"
                        active={true}
                        display={props.state.excludeSingleName}
                        component="dropdown"
                        options={dropdownQuestsOptions}
                        handleChange={handleChange}
                        state={props.state}
                    />
                </BlockUI>
            </div>
            <div className="column flex">
                <BlockUI
                    blocked={props.state.buySellPeriodDays <= 0}
                    className="flex w-full"
                >
                    <span className="inplace-static-text">Sell</span>
                    <InPlaceElement
                        id="sellIncSumPerc"
                        active={false}
                        display={`${props.state.sellIncSumPerc}%`}
                        type="number"
                        component="input"
                        handleChange={handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">
                        of owned tokens that decreased in price by
                    </span>
                    <InPlaceElement
                        id="sellIncByPerc"
                        active={false}
                        display={`${props.state.sellIncByPerc}%`}
                        type="number"
                        component="input"
                        handleChange={handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">(up to 7 days)</span>
                </BlockUI>
            </div>
            <div className="column flex">
                <BlockUI
                    blocked={props.state.buySellPeriodDays <= 0}
                    className="flex w-full"
                >
                    <span className="inplace-static-text">Sell</span>
                    <InPlaceElement
                        id="sellDecSumPerc"
                        active={false}
                        display={`${props.state.sellDecSumPerc}%`}
                        type="number"
                        component="input"
                        handleChange={handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">
                        of owned tokens that increased in price by
                    </span>
                    <InPlaceElement
                        id="sellDecByPerc"
                        active={false}
                        display={`${props.state.sellDecByPerc}%`}
                        type="number"
                        component="input"
                        handleChange={handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">(up to 7 days)</span>
                </BlockUI>
            </div>

            <hr className="dashed-divider" />

            <div className="column flex">
                <span className="inplace-static-text">
                    On initialization create Quest
                </span>
                <InPlaceElement
                    id="createQuest"
                    active={true}
                    display={props.state.createQuest}
                    component="dropdown"
                    options={dropdownOptions}
                    handleChange={handleChange}
                    state={props.state}
                />
            </div>
            <div className="column flex">
                <span className="inplace-static-text">Once every</span>
                <InPlaceElement
                    id="keepCreatingPeriodDays"
                    active={false}
                    display={`${props.state.keepCreatingPeriodDays}`}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={props.state}
                />
                <span className="inplace-static-text">
                    days, create quest of type
                </span>
                <InPlaceElement
                    id="keepCreatingQuests"
                    active={true}
                    display={props.state.keepCreatingQuests}
                    component="dropdown"
                    options={dropdownOptions}
                    handleChange={handleChange}
                    state={props.state}
                />
            </div>
            <div className="column flex mt-3">
                <span className="inplace-static-text">Every</span>
                <InPlaceElement
                    id="valueSellPeriodDays"
                    active={false}
                    display={props.state.valueSellPeriodDays}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={props.state}
                />
                <span className="inplace-static-text">days sells</span>
                <InPlaceElement
                    id="valueSellAmount"
                    active={false}
                    display={props.state.valueSellAmount}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={props.state}
                />
                <span className="inplace-static-text">
                    USDC value of their own quest tokens
                </span>
            </div>
        </div>
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
    const aliasAlert = useRef(null)
    const quests = useQuestStore((state) => state.quests)

    const defaultOption = [{ label: 'Select Quest', value: '' }]
    const dropdownQuests = quests.map((quest) => ({
        label: quest,
        value: quest
    }))
    const dropdownQuestsOptions = Array.prototype.concat(
        defaultOption,
        dropdownQuests
    )

    const handleChange = (evt) => {
        const newState = { ...props.state, [evt.target.id]: evt.target.value }
        props.updateQuestConfig(newState)
    }

    const handleDelete = (id) => {
        props.deleteQuestConfig(id)
    }

    return (
        <div className="flex flex-column gen-card">
            <div className="header flex">
                <span className="inplace-static-text">Quest -</span>
                <div className="flex flex-grow-none">
                    <InPlaceElement
                        id="questGenName"
                        active={true}
                        display={props.state.questGenName}
                        component="input"
                        type="text"
                        handleChange={handleChange}
                        state={props.state}
                        style={{ width: '14rem' }}
                    />
                </div>

                <div className="flex flex-grow-1 justify-content-end">
                    <Message
                        className="alias-alert"
                        severity="error"
                        text="Alias is required"
                        ref={aliasAlert}
                        style={{ display: 'none' }}
                    />
                    <div className="mr-3"></div>
                    <Button
                        icon="pi pi-trash"
                        className="w-2rem h-2rem p-button-danger"
                        onClick={() => handleDelete(props.state.questGenAlias)}
                    />
                </div>
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    Initial investment from author
                </span>
                <InPlaceElement
                    id="initialAuthorInvest"
                    active={false}
                    display={props.state.initialAuthorInvest}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={props.state}
                />
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    Initial numbers of tokens in USDC pool{' '}
                    {props.state.poolSizeTokens}
                </span>
                {/*<InPlaceElement
                    id="poolSizeTokens"
                    active={false}
                    display={props.state.poolSizeTokens}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={props.state}
                />*/}
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    Initial token price: 1
                </span>
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    Initial positions: 1...10000, 20...10000, 50...10000,
                    200...10000
                </span>
            </div>
            <div className="column flex">
                <span className="inplace-static-text">Probability to cite</span>
                <InPlaceElement
                    id="citeSingleName"
                    active={true}
                    display={props.state.citeSingleName}
                    component="dropdown"
                    options={dropdownQuestsOptions}
                    handleChange={handleChange}
                    state={props.state}
                />
                <InPlaceElement
                    id="probCiteSingle"
                    active={false}
                    display={`${props.state.probCiteSingle}%`}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={props.state}
                />
            </div>
            {props.state.citeSingleName ? (
                <div className="column flex">
                    <span className="inplace-static-text">
                        Portion of tokens used for citing{' '}
                        {props.state.citeSingleName}
                    </span>
                    <InPlaceElement
                        id="singleCitePerc"
                        active={false}
                        display={`${props.state.singleCitePerc}%`}
                        type="number"
                        component="input"
                        handleChange={handleChange}
                        state={props.state}
                    />
                </div>
            ) : (
                ''
            )}
            <div className="column flex">
                <span className="inplace-static-text">
                    Probability to cite other papers
                </span>
                <InPlaceElement
                    id="probOtherCite"
                    active={false}
                    display={`${props.state.probOtherCite}%`}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={props.state}
                />
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    Portion of tokens used for other citings
                </span>
                <InPlaceElement
                    id="otherCitePerc"
                    active={false}
                    display={`${props.state.otherCitePerc}%`}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={props.state}
                />
            </div>
        </div>
    )
}

const InPlaceElement = (props) => {
    return (
        <Inplace active={props.active} closable onToggle={props.onToggle}>
            <InplaceDisplay>{props.display}</InplaceDisplay>
            <InplaceContent>
                {props.component === 'input' ? (
                    <PresetInPlaceInput {...props} />
                ) : (
                    <PresetInPlaceDropdown {...props} />
                )}
            </InplaceContent>
        </Inplace>
    )
}

const PresetInPlaceInput = (props) => {
    return (
        <div className="flex">
            <InputText
                id={props.id}
                value={props.state[props.id]}
                autoFocus
                type={props.type || 'text'}
                className="block p-inputtext-sm"
                onChange={props.handleChange}
                style={props.style}
            />
        </div>
    )
}

const PresetInPlaceDropdown = (props) => {
    return (
        <Dropdown
            id={props.id}
            value={props.state[props.id]}
            options={props.options}
            onChange={props.handleChange}
            placeholder={props.defaultValue || 'Select Option'}
            editable={props.editable}
        />
    )
}
