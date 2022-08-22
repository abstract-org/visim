import React, { useRef, useState } from 'react'

import { Dropdown } from 'primereact/dropdown'
import { Checkbox } from 'primereact/checkbox'
import { InputText } from 'primereact/inputtext'
import { ScrollPanel } from 'primereact/scrollpanel'
import { Button } from 'primereact/button'
import { Messages } from 'primereact/messages'
import { Slider } from 'primereact/slider'

import useQuestStore from './quest.store'
import useInvestorStore from '../Investor/investor.store'
import usePoolStore from '../Pool/pool.store'

import globalState from '../GlobalState'

const addPoolSelector = (state) => state.addPool
const addQuestSelector = (state) => state.addQuest

export const QuestSelector = () => {
    const quests = useQuestStore((state) => state.quests)
    const activeQuest = useQuestStore((state) => state.active)
    const setActive = useQuestStore((state) => state.setActive)
    const quest = activeQuest && globalState.quests.get(activeQuest)

    return (
        <Dropdown
            className="w-6"
            value={quest && quest.name}
            options={quests.map(
                (questName) => globalState.quests.get(questName).name
            )}
            onChange={(e) =>
                setActive(quests.find((questName) => questName === e.value))
            }
            placeholder="Choose Quest"
        />
    )
}

export const QuestCitation = () => {
    const [citationRange, setCitationRange] = useState(5)
    const [selectedQuests, setSelectedQuests] = useState([])
    const handleCitationRange = (value) => setCitationRange(value)
    const activeInvestor = useInvestorStore((state) => state.active)
    const activePool = usePoolStore((state) => state.active)
    const addPool = usePoolStore((state) => state.addPool)
    const pool = globalState.pools.get(activePool)
    const investor = globalState.investors.get(activeInvestor)
    const swaps = usePoolStore((state) => state.swaps)
    const createValueLink = usePoolStore((state) => state.createValueLink)

    const msgs = useRef(null)

    const handleCiteQuest = () => {
        if (selectedQuests.length <= 0) {
            console.log(`You need to select which quest to cite`)
            msgs.current.show({
                severity: 'warn',
                detail: 'You need to select which quest to cite'
            })
            return
        }

        if (!activeInvestor || !activePool) {
            console.log(`You need to select investor and a pool (paper)`)
            msgs.current.show({
                severity: 'warn',
                detail: 'You need to select investor and a pool (paper)'
            })
            return
        }

        const calculatedAmountLeft = Math.floor(
            (investor.balances[pool.tokenRight.name] / 100) * citationRange
        )
        const cumulativeDeposit = selectedQuests.length * calculatedAmountLeft

        if (
            isNaN(calculatedAmountLeft) ||
            cumulativeDeposit > investor.balances[pool.tokenRight.name] ||
            calculatedAmountLeft <= 0
        ) {
            console.log(
                `Not enough ${pool.tokenRight.name} balance to cite selected quest(s)`
            )
            msgs.current.show({
                severity: 'warn',
                detail: `Not enough ${pool.tokenRight.name} balance to cite selected quest(s)`
            })
            return
        }

        const citingQuest = globalState.quests.get(pool.tokenRight.name)

        selectedQuests.forEach((questName) => {
            if (questName === pool.tokenRight.name) {
                return
            }

            const poolName = `${pool.tokenRight.name}-${questName}`
            const swapPoolName = `${questName}-${pool.tokenRight.name}`
            if (
                globalState.pools.get(poolName) ||
                globalState.pools.get(swapPoolName)
            ) {
                console.log(`Value link pool ${poolName} already exists`)
                msgs.current.show({
                    severity: 'warn',
                    detail: `Value link pool ${poolName} already exists`
                })
                return
            }

            const citedQuest = globalState.quests.get(questName)
            const vlPool = investor.citeQuest(
                citingQuest,
                citedQuest,
                1,
                10,
                calculatedAmountLeft,
                0
            )
            console.log(calculatedAmountLeft)
            investor.addBalance(citingQuest.name, -calculatedAmountLeft)

            globalState.pools.set(vlPool.name, vlPool)
            addPool(vlPool.name)
            createValueLink({
                investor: investor.hash,
                vl: vlPool.name,
                initialAmount: calculatedAmountLeft,
                initialToken: citingQuest.name
            })
        })
    }

    return (
        <div>
            <h3>Citing Quests</h3>
            <ScrollPanel className="w-full h-10rem border-1 border-solid border-500 p-3">
                <CitingQuestList
                    selectedQuests={selectedQuests}
                    setSelectedQuests={setSelectedQuests}
                />
            </ScrollPanel>
            <CitingQuestLiquidity
                selectedQuests={selectedQuests}
                citationRange={citationRange}
                handleCitationRange={handleCitationRange}
            />
            <div className="flex justify-content-center">
                <Button
                    className="p-button-info w-12 mt-2 justify-content-center"
                    onClick={handleCiteQuest}
                >
                    Cite Quest
                </Button>
            </div>
            <div>
                <Messages ref={msgs}></Messages>
            </div>
        </div>
    )
}

export const CitingQuestList = (props) => {
    const quests = useQuestStore((state) => state.quests)
    const activePool = usePoolStore((state) => state.active)
    const pool = activePool && globalState.pools.get(activePool)

    const handleQuestSelect = (e) => {
        let selectedQuests = [...props.selectedQuests]

        if (e.checked) {
            selectedQuests.push(e.value)
        } else {
            selectedQuests.splice(selectedQuests.indexOf(e.value), 1)
        }

        props.setSelectedQuests(selectedQuests)
    }

    if (quests.length <= 0) {
        return (
            <div style={{ margin: '0.5rem' }}>
                No Quests were created so far...
            </div>
        )
    }

    return (
        <div>
            {quests.map((quest, idx) => {
                const questObj = globalState.quests.get(quest)
                // @TODO: Reduce
                if (pool && pool.tokenRight.name === quest) {
                    return null
                }

                return (
                    <div className="field-checkbox" key={idx}>
                        <Checkbox
                            inputId={`quest-${questObj.name}`}
                            name={`quest-${questObj.name}`}
                            value={questObj.name}
                            onChange={handleQuestSelect}
                            checked={props.selectedQuests.includes(
                                questObj.name
                            )}
                        />
                        <label htmlFor={`quest-${questObj.name}`}>
                            {questObj.name}
                        </label>
                    </div>
                )
            })}
        </div>
    )
}

export const CitingQuestLiquidity = (props) => {
    const activeInvestor = useInvestorStore((state) => state.active)
    const investor = globalState.investors.get(activeInvestor)
    const activePool = usePoolStore((state) => state.active)
    const pool = globalState.pools.get(activePool)
    const swaps = usePoolStore((state) => state.swaps)
    const msgs = useRef(null)

    if (props.selectedQuests.length <= 0) {
        return
    }

    if (!activePool) {
        return (
            <div className="grid">
                <div className="col-12 mt-2">
                    Select pool (paper) to see price range
                </div>
            </div>
        )
    }

    if (!investor.balances[pool.tokenRight.name]) {
        return (
            <div className="grid">
                <div className="col-12 mt-2">
                    Not enough {pool.tokenRight.name} balance to cite any quest
                </div>
            </div>
        )
    }

    const calculatedDeposit =
        activePool &&
        activeInvestor &&
        Math.floor(
            (investor.balances[pool.tokenRight.name] / 100) *
                props.citationRange
        )

    const cumulativeDeposit = props.selectedQuests.length * calculatedDeposit

    const shouldNotRender =
        investor.balances[pool.tokenRight.name] <= 0 ||
        calculatedDeposit < 1 ||
        investor.balances[pool.tokenRight.name] < calculatedDeposit ||
        cumulativeDeposit > investor.balances[pool.tokenRight.name]

    // @TODO: Take logic out of render, calculate all citations - check if will run out of balance
    return (
        <div className="mt-3">
            <div className="grid">
                <div className="col-12">
                    <span className="text-s">
                        New positions will be opened:
                        <br />
                        {props.selectedQuests.map((selectedQuest, idx) => {
                            if (shouldNotRender) {
                                return (
                                    <span
                                        key={idx}
                                        className="text-red-600 block"
                                    >
                                        Not enough {pool.tokenRight.name}{' '}
                                        balance to cite {selectedQuest}
                                    </span>
                                )
                            }

                            return (
                                <span
                                    key={idx}
                                    className="text-green-600 block"
                                >
                                    Will deposit {calculatedDeposit}{' '}
                                    {pool.tokenRight.name} to cite{' '}
                                    {selectedQuest}
                                </span>
                            )
                        })}
                    </span>
                </div>
            </div>
            <div className="grid">
                <div className="col-12">
                    <span className="text-xs">
                        * Price range by default: 1 to 10
                    </span>
                </div>
            </div>
            <div className="grid">
                <div className="col-12">
                    <span className="text-center block pb-2">
                        {props.citationRange}%
                    </span>
                    <Slider
                        step={5}
                        value={props.citationRange}
                        onChange={(e) => props.handleCitationRange(e.value)}
                    />
                </div>
            </div>
            <div className="grid">
                <div className="col-12">
                    <Messages ref={msgs} />
                </div>
            </div>
        </div>
    )
}

export const QuestCreation = () => {
    const msgs = useRef(null)
    const [questName, setQuestName] = useState('')
    const addPool = usePoolStore(addPoolSelector)
    const addQuest = useQuestStore(addQuestSelector)
    const activeInvestor = useInvestorStore((state) => state.active)
    const quests = useQuestStore((state) => state.quests)

    const handleQuestName = (e) => {
        setQuestName(e.target.value)
    }

    const handleCreateQuest = () => {
        if (questName.length <= 0 || activeInvestor === null) {
            console.log('Cannot create quest without selecting investor')
            msgs.current.show({
                severity: 'warn',
                detail: 'Please give quest a name and select investor first'
            })
            return
        }

        if (quests.find((quest) => quest === questName)) {
            console.log('Cannot create quest with the same title')
            msgs.current.show({
                severity: 'warn',
                detail: `Quest ${questName} already exists`
            })
            return
        }

        const investor =
            activeInvestor && globalState.investors.get(activeInvestor)
        const tokenRight = investor.createQuest(questName)
        const pool = tokenRight.createPool()
        tokenRight.addPool(pool)
        tokenRight.initializePoolPositions(pool)

        globalState.quests.set(tokenRight.name, tokenRight)
        globalState.pools.set(pool.name, pool)
        addQuest(tokenRight.name)
        addPool(pool.name)

        setQuestName('')
    }

    return (
        <div>
            <h3>Create Quest</h3>
            <div>
                <div className="field">
                    <label htmlFor="questName" className="block">
                        Name
                    </label>
                    <InputText
                        id="questName"
                        aria-describedby="questName-help"
                        className="w-full"
                        value={questName}
                        onChange={handleQuestName}
                        autoComplete="off"
                    />
                </div>
            </div>
            <div className="flex justify-content-center">
                <Button
                    className="p-button-primary w-12 mt-2 justify-content-center"
                    onClick={handleCreateQuest}
                >
                    Create new Quest
                </Button>
            </div>
            <div>
                <Messages ref={msgs}></Messages>
            </div>
        </div>
    )
}
