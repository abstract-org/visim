import Chance from 'chance'
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
import React, { useRef, useState } from 'react'

import globalState from '../GlobalState'
import useInvestorStore from '../Investor/investor.store'
import useLogsStore from '../Logs/logs.store'
import usePoolStore from '../Pool/pool.store'
import useQuestStore from '../Quest/quest.store'
import Generator from './Generator.class'
import useGeneratorStore from './generator.store'
import { dayData, invGen, questGen } from './initialState'

const updateInvSelector = (state) => state.updateInvConfig
const deleteInvSelector = (state) => state.deleteInvConfig

const updateQuestSelector = (state) => state.updateQuestConfig
const deleteQuestSelector = (state) => state.deleteQuestConfig

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
            })

            await genManager.sleep(1000)
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

    const chance = Chance()

    const handleNewInvestorGen = () => {
        if (invConfigs.length >= 4) {
            return
        }

        const newInvGen = Object.assign(invGen, {
            invGenAlias: chance.syllable() + chance.integer({ min: 1, max: 10 })
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
    const [state, setState] = useState(props.state)
    const quests = useQuestStore((state) => state.quests)

    const defaultOptions = [
        {
            label: 'Select Template',
            value: ''
        }
        /*{
            label: 'Random Template',
            value: 'random'
        }*/
    ]
    const questOptions = questConfigs.map((gen) => ({
        label: `#${gen.questGenAlias}`,
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
        setState({
            ...state,
            [evt.target.id]: evt.target.value
        })
    }

    const handleSave = () => {
        const alertRef = aliasAlert.current.getElement()

        if (state.invGenAlias.length > 0) {
            props.updateInvConfig(state)
            alertRef.style.display = 'none'
        } else {
            alertRef.style.display = 'block'
        }
    }

    const handleDelete = (invGenAlias) => {
        props.deleteInvConfig(invGenAlias)
    }

    return (
        <div className="flex flex-column gen-card">
            <div className="header flex">
                <div className="flex flex-grow-1">
                    <span className="inplace-static-text">
                        Investor - {state.invGenAlias}
                    </span>
                    {/*<InPlaceElement
                        id="invGenAlias"
                        active={true}
                        display={state.invGenAlias}
                        type="text"
                        component="input"
                        handleChange={handleChange}
                        state={state}
                    />*/}

                    <div className="flex flex-grow-1 justify-content-end">
                        <Message
                            className="alias-alert"
                            severity="error"
                            text="Alias is required"
                            ref={aliasAlert}
                            style={{ display: 'none' }}
                        />
                        <Button
                            icon="pi pi-save"
                            className="w-2rem h-2rem p-button-success"
                            onClick={handleSave}
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
                    display={`${state.dailySpawnProbability}%`}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={state}
                />
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    USDC Initial Balance
                </span>
                <InPlaceElement
                    id="initialBalance"
                    active={false}
                    display={state.initialBalance}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={state}
                />
            </div>
            <hr className="dashed-divider" />
            <div className="column flex">
                <span className="inplace-static-text">Every</span>
                <InPlaceElement
                    id="buySellPeriodDays"
                    active={false}
                    display={state.buySellPeriodDays}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={state}
                />
                <span className="inplace-static-text">days:</span>
            </div>
            <div className="column flex">
                <BlockUI
                    blocked={state.buySellPeriodDays <= 0}
                    className="flex w-full"
                >
                    <span className="inplace-static-text">
                        Exclude quest from direct investment:
                    </span>
                    <InPlaceElement
                        id="excludeSingleName"
                        active={true}
                        display={state.excludeSingleName}
                        component="dropdown"
                        options={dropdownQuestsOptions}
                        handleChange={handleChange}
                        state={state}
                    />
                </BlockUI>
            </div>
            <div className="column flex">
                <BlockUI
                    blocked={state.buySellPeriodDays <= 0}
                    className="flex w-full"
                >
                    <span className="inplace-static-text">Buys using</span>
                    <InPlaceElement
                        id="buySumPerc"
                        active={false}
                        display={`${state.buySumPerc}%`}
                        type="number"
                        component="input"
                        handleChange={handleChange}
                        state={state}
                    />
                    <span className="inplace-static-text">
                        of their balance in
                    </span>

                    <InPlaceElement
                        id="buyQuestPerc"
                        active={false}
                        display={`${state.buyQuestPerc}%`}
                        type="number"
                        component="input"
                        handleChange={handleChange}
                        state={state}
                    />
                    <span className="inplace-static-text">
                        quests that are top
                    </span>

                    <InPlaceElement
                        id="buyGainerPerc"
                        active={false}
                        display={`${state.buyGainerPerc}%`}
                        type="number"
                        component="input"
                        handleChange={handleChange}
                        state={state}
                    />
                    <span className="inplace-static-text">
                        gainers (up to 30 days)
                    </span>
                </BlockUI>
            </div>
            <div className="column flex">
                <BlockUI
                    blocked={state.buySellPeriodDays <= 0}
                    className="flex w-full"
                >
                    <span className="inplace-static-text">Sell</span>
                    <InPlaceElement
                        id="sellIncSumPerc"
                        active={false}
                        display={`${state.sellIncSumPerc}%`}
                        type="number"
                        component="input"
                        handleChange={handleChange}
                        state={state}
                    />
                    <span className="inplace-static-text">
                        of owned tokens that decreased in price by
                    </span>
                    <InPlaceElement
                        id="sellIncByPerc"
                        active={false}
                        display={`${state.sellIncByPerc}%`}
                        type="number"
                        component="input"
                        handleChange={handleChange}
                        state={state}
                    />
                    <span className="inplace-static-text">(up to 7 days)</span>
                </BlockUI>
            </div>
            <div className="column flex">
                <BlockUI
                    blocked={state.buySellPeriodDays <= 0}
                    className="flex w-full"
                >
                    <span className="inplace-static-text">Sell</span>
                    <InPlaceElement
                        id="sellDecSumPerc"
                        active={false}
                        display={`${state.sellDecSumPerc}%`}
                        type="number"
                        component="input"
                        handleChange={handleChange}
                        state={state}
                    />
                    <span className="inplace-static-text">
                        of owned tokens that increased in price by
                    </span>
                    <InPlaceElement
                        id="sellDecByPerc"
                        active={false}
                        display={`${state.sellDecByPerc}%`}
                        type="number"
                        component="input"
                        handleChange={handleChange}
                        state={state}
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
                    display={state.createQuest}
                    component="dropdown"
                    options={dropdownOptions}
                    handleChange={handleChange}
                    state={state}
                />
            </div>
            <div className="column flex">
                <span className="inplace-static-text">Every</span>
                <InPlaceElement
                    id="valueSellEveryDays"
                    active={false}
                    display={state.valueSellEveryDays}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={state}
                />
                <span className="inplace-static-text">days sells</span>
                <InPlaceElement
                    id="valueSellAmount"
                    active={false}
                    display={state.valueSellAmount}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={state}
                />
                <span className="inplace-static-text">
                    value of his own created quest
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

    const chance = Chance()

    const handleNewQuestGen = () => {
        if (questConfigs.length >= 4) {
            return
        }

        const newQuestGen = Object.assign(questGen, {
            questGenAlias:
                chance.syllable() + chance.integer({ min: 1, max: 10 })
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
    const [state, setState] = useState(props.state)
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
        setState({
            ...state,
            [evt.target.id]: evt.target.value
        })
    }

    const handleSave = () => {
        const alertRef = aliasAlert.current.getElement()

        if (state.questGenAlias.length > 0) {
            props.updateQuestConfig(state)
            alertRef.style.display = 'none'
        } else {
            alertRef.style.display = 'block'
        }
    }

    const handleDelete = (id) => {
        props.deleteQuestConfig(id)
    }

    return (
        <div className="flex flex-column gen-card">
            <div className="header flex">
                <span className="inplace-static-text">
                    Quest - {state.questGenAlias}
                </span>
                {/*<InPlaceElement
                    id="questGenAlias"
                    active={true}
                    display={state.questGenAlias}
                    type="text"
                    component="input"
                    handleChange={handleChange}
                    state={state}
    />*/}

                <div className="flex flex-grow-1 justify-content-end">
                    <Message
                        className="alias-alert"
                        severity="error"
                        text="Alias is required"
                        ref={aliasAlert}
                        style={{ display: 'none' }}
                    />
                    <Button
                        icon="pi pi-save"
                        className="w-2rem h-2rem p-button-success"
                        onClick={handleSave}
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
                    display={state.initialAuthorInvest}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={state}
                />
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    Initial numbers of tokens in USDC pool{' '}
                    {state.poolSizeTokens}
                </span>
                {/*<InPlaceElement
                    id="poolSizeTokens"
                    active={false}
                    display={state.poolSizeTokens}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={state}
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
                    display={state.citeSingleName}
                    component="dropdown"
                    options={dropdownQuestsOptions}
                    handleChange={handleChange}
                    state={state}
                />
                <InPlaceElement
                    id="probCiteSingle"
                    active={false}
                    display={`${state.probCiteSingle}%`}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={state}
                />
            </div>
            {state.citeSingleName ? (
                <div className="column flex">
                    <span className="inplace-static-text">
                        Portion of tokens used for citing {state.citeSingleName}
                    </span>
                    <InPlaceElement
                        id="singleCitePerc"
                        active={false}
                        display={`${state.singleCitePerc}%`}
                        type="number"
                        component="input"
                        handleChange={handleChange}
                        state={state}
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
                    display={`${state.probOtherCite}%`}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={state}
                />
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    Portion of tokens used for other citings
                </span>
                <InPlaceElement
                    id="otherCitePerc"
                    active={false}
                    display={`${state.otherCitePerc}%`}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={state}
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
            placeholder="Select Generator"
        />
    )
}
