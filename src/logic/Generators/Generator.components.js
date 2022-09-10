import Chance from 'chance'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { Divider } from 'primereact/divider'
import { Dropdown } from 'primereact/dropdown'
import { Inplace, InplaceContent, InplaceDisplay } from 'primereact/inplace'
import { InputNumber } from 'primereact/inputnumber'
import { InputText } from 'primereact/inputtext'
import { Message } from 'primereact/message'
import { ProgressBar } from 'primereact/progressbar'
import { Sidebar } from 'primereact/sidebar'
import React, { useRef, useState } from 'react'

import globalState from '../GlobalState'
import useInvestorStore from '../Investor/investor.store'
import usePoolStore from '../Pool/pool.store'
import useQuestStore from '../Quest/quest.store'
import Generator from './Generator.class'
import useGeneratorStore from './generator.store'
import { dayData, invGen, questGen } from './initialState'

const addInvSelector = (state) => state.addInvConfig
const updateInvSelector = (state) => state.updateInvConfig
const deleteInvSelector = (state) => state.deleteInvConfig

const addQuestSelector = (state) => state.addQuestConfig
const updateQuestSelector = (state) => state.updateQuestConfig
const deleteQuestSelector = (state) => state.deleteQuestConfig

export const GeneratorRunner = () => {
    const invConfigs = useGeneratorStore((state) => state.invConfigs)
    const questConfigs = useGeneratorStore((state) => state.questConfigs)
    const [genDays, setGenDays] = useState(10)
    const [genActive, setGenActive] = useState(false)
    const [stopGen, setStopGen] = useState(false)
    const [genOutput, setGenOutput] = useState({
        day: 1,
        ...dayData
    })

    const addPool = usePoolStore((state) => state.addPool)
    const addInvestor = useInvestorStore((state) => state.addInvestor)
    const addQuest = useQuestStore((state) => state.addQuest)
    const setActivePool = usePoolStore((state) => state.setActive)

    const handleGenerate = async () => {
        if (genDays <= 0) {
            console.log('Specify amount of days to simulate')
            return
        }

        if (invConfigs.length <= 0 || questConfigs.length <= 0) {
            console.log(
                'Please create generator configs with investor and quest panel first'
            )
            return
        }

        const genManager = new Generator(invConfigs, questConfigs, genDays)

        setGenActive(true)

        // Every day
        for (let day = 1; day <= genDays; day++) {
            console.log(`Simulating day ${day}`)
            const stepData = await genManager.step(day)
            await genManager.sleep(500)

            setGenOutput({
                ...genOutput,
                ...stepData,
                day
            })
        }

        genManager.getInvestors().forEach((investor) => {
            globalState.investors.set(investor.hash, investor)
            addInvestor(investor.hash)
        })
        genManager.getQuests().forEach((quest) => {
            globalState.quests.set(quest.name, quest)
            addQuest(quest.name)
        })
        genManager.getPools().forEach((pool) => {
            globalState.pools.set(pool.name, pool)
            addPool(pool.name)
        })
    }

    const handleStop = () => {
        setGenActive(false)
        setStopGen(true)
    }

    return (
        <div>
            <Sidebar
                visible={genActive}
                onHide={handleStop}
                closeOnEscape={false}
                blockScroll={true}
                dismissable={false}
                fullScreen={true}
                className="sized-fullscreen"
            >
                <h1>Simulation Dashboard</h1>
                <ProgressBar
                    value={(genOutput.day * (100 / genDays)).toFixed(1)}
                    className="w-6 flex align-self-center"
                />
            </Sidebar>
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

    const chance = Chance()

    const handleNewInvestorGen = () => {
        const newInvGen = Object.assign(invGen, {
            invGenAlias: chance.syllable() + chance.integer({ min: 1, max: 10 })
        })

        addInvConfig(newInvGen)
    }

    return (
        <div>
            <Button
                label="Create Investor Template"
                icon="pi pi-plus"
                className="px-2 p-button-secondary"
                onClick={handleNewInvestorGen}
            ></Button>
            <div className="gen-wrapper flex flex-row flex-nowrap justify-content-start">
                {invConfigs.map((gen, key) => {
                    return (
                        <div
                            key={key}
                            header={key}
                            className={`flex-order-${gen.invGenAlias} flex flex-grow-0`}
                        >
                            <GenCardInvestor invGenAlias={gen.invGenAlias} />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export const GenCardInvestor = (props) => {
    const aliasAlert = useRef(null)
    const invConfigs = useGeneratorStore((state) => state.invConfigs)
    const questConfigs = useGeneratorStore((state) => state.questConfigs)
    const [state, setState] = useState(
        invConfigs.find((gen) => gen.invGenAlias === props.invGenAlias)
    )
    const updateInvConfig = useGeneratorStore(updateInvSelector)
    const deleteInvConfig = useGeneratorStore(deleteInvSelector)

    const defaultOptions = [
        {
            label: 'Select Template',
            value: ''
        },
        {
            label: 'Random Template',
            value: 'random'
        }
    ]
    const questOptions = questConfigs.map((gen) => ({
        label: `#${gen.questGenAlias}`,
        value: gen.questGenAlias
    }))
    const dropdownOptions = Array.prototype.concat(defaultOptions, questOptions)

    const handleChange = (evt) => {
        setState({
            ...state,
            [evt.target.id]: evt.target.value
        })
    }

    const handleSave = () => {
        const alertRef = aliasAlert.current.getElement()

        if (state.invGenAlias.length > 0) {
            updateInvConfig(state)
            alertRef.style.display = 'none'
        } else {
            alertRef.style.display = 'block'
        }
    }

    const handleDelete = (invGenAlias) => {
        console.log(invGenAlias)
        deleteInvConfig(invGenAlias)
    }

    return (
        <div className="flex flex-column gen-card">
            <div className="header flex">
                <div className="flex flex-grow-1">
                    <span className="inplace-static-text">Investor -</span>
                    <InPlaceElement
                        id="invGenAlias"
                        active={true}
                        display={state.invGenAlias}
                        type="text"
                        component="input"
                        handleChange={handleChange}
                        state={state}
                    />

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
                            onClick={() => handleDelete(props.invGenAlias)}
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
                <span className="inplace-static-text">of their balance in</span>

                <InPlaceElement
                    id="buyQuestPerc"
                    active={false}
                    display={`${state.buyQuestPerc}%`}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={state}
                />
                <span className="inplace-static-text">quests that are top</span>

                <InPlaceElement
                    id="buyGainerPerc"
                    active={false}
                    display={`${state.buyGainerPerc}%`}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={state}
                />
                <span className="inplace-static-text">gainers</span>
            </div>
            <div className="column flex">
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
                    of owned tokens that decreased in price
                </span>
            </div>
            <div className="column flex">
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
                    of owned tokens that increased in price
                </span>
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

    const chance = Chance()

    const handleNewQuestGen = () => {
        const newQuestGen = Object.assign(questGen, {
            questGenAlias:
                chance.syllable() + chance.integer({ min: 1, max: 10 })
        })
        addQuestConfig(newQuestGen)
    }

    return (
        <div>
            <Button
                label="Create Quest"
                icon="pi pi-plus"
                className="px-2 p-button-secondary"
                onClick={handleNewQuestGen}
            ></Button>
            <div className="gen-wrapper flex flex-row flex-nowrap justify-content-start">
                {questConfigs.map((gen, key) => {
                    return (
                        <div
                            key={key}
                            header={key}
                            className={`flex-order-${gen.questGenAlias} flex flex-grow-0`}
                        >
                            <GenCardQuest questGenAlias={gen.questGenAlias} />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export const GenCardQuest = (props) => {
    const aliasAlert = useRef(null)
    const questConfigs = useGeneratorStore((state) => state.questConfigs)
    const [state, setState] = useState(
        questConfigs.find((gen) => gen.questGenAlias === props.questGenAlias)
    )
    const updateQuestConfig = useGeneratorStore(updateQuestSelector)
    const deleteQuestConfig = useGeneratorStore(deleteQuestSelector)

    const handleChange = (evt) => {
        setState({
            ...state,
            [evt.target.id]: evt.target.value
        })
    }

    const handleSave = () => {
        const alertRef = aliasAlert.current.getElement()

        if (state.questGenAlias.length > 0) {
            updateQuestConfig(state)
            alertRef.style.display = 'none'
        } else {
            alertRef.style.display = 'block'
        }
    }

    const handleDelete = (id) => {
        deleteQuestConfig(id)
    }

    return (
        <div className="flex flex-column gen-card">
            <div className="header flex">
                <span className="inplace-static-text">Quest -</span>
                <InPlaceElement
                    id="questGenAlias"
                    active={true}
                    display={state.questGenAlias}
                    type="text"
                    component="input"
                    handleChange={handleChange}
                    state={state}
                />

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
                        onClick={() => handleDelete(props.questGenAlias)}
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
                    Initial numbers of tokens in USDC pool
                </span>
                <InPlaceElement
                    id="poolSizeTokens"
                    active={false}
                    display={state.poolSizeTokens}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={state}
                />
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
                <span className="inplace-static-text">
                    Probability to cite Agora
                </span>
                <InPlaceElement
                    id="probCiteAgora"
                    active={false}
                    display={`${state.probCiteAgora}%`}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={state}
                />
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    Portion of tokens used for citing Agora
                </span>
                <InPlaceElement
                    id="agoraCitePerc"
                    active={false}
                    display={`${state.agoraCitePerc}%`}
                    type="number"
                    component="input"
                    handleChange={handleChange}
                    state={state}
                />
            </div>
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