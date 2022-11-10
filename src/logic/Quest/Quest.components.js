import { Button } from 'primereact/button'
import { Checkbox } from 'primereact/checkbox'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { Messages } from 'primereact/messages'
import { ScrollPanel } from 'primereact/scrollpanel'
import { Slider } from 'primereact/slider'
import React, { useRef, useState } from 'react'

import globalState from '../GlobalState'
import useInvestorStore from '../Investor/investor.store'
import useLogsStore from '../Logs/logs.store'
import usePoolStore from '../Pool/pool.store'
import { isNumericString } from '../Utils/logicUtils'
import { appendIfNotExist } from '../Utils/uiUtils'
import UsdcToken from './UsdcToken.class'
import useQuestStore from './quest.store'

const addPoolSelector = (state) => state.addPool
const addQuestSelector = (state) => state.addQuest

const usdcToken = new UsdcToken()
if (!globalState.quests.has(usdcToken.name)) {
    globalState.quests.set(usdcToken.name, usdcToken)
}

export const QuestSelector = () => {
    const quests = useQuestStore((state) => state.quests)
    const activeQuest = useQuestStore((state) => state.active)
    const setActive = useQuestStore((state) => state.setActive)
    const quest = activeQuest && globalState.quests.get(activeQuest)
    const setActivePool = usePoolStore((state) => state.setActive)
    const setSwapMode = usePoolStore((state) => state.setSwapMode)

    const handleActiveQuest = (e) => {
        const questName = quests.find((questName) => questName === e.value)
        const quest = globalState.quests.get(questName)
        for (const pool of quest.pools) {
            if (globalState.pools.get(pool).isQuest()) {
                setActivePool(pool)
                globalState.poolStore.active = pool
            }
        }

        setActive(questName)
        globalState.questStore.active = questName
    }

    return (
        <Dropdown
            className="w-full"
            value={activeQuest}
            options={quests.map((questName) => questName)}
            onChange={handleActiveQuest}
            placeholder="Choose Quest"
        />
    )
}

export const QuestCitation = () => {
    const [citationRange, setCitationRange] = useState(5)
    const [citationMultiplier, setCitationMultiplier] = useState(2)
    const [selectedQuests, setSelectedQuests] = useState([])
    const handleCitationRange = (value) => setCitationRange(value)
    const handleCitationMultiplier = (value) => setCitationMultiplier(value)

    const activeInvestor = useInvestorStore((state) => state.active)
    const setActivePool = usePoolStore((state) => state.setActive)
    const addPool = usePoolStore((state) => state.addPool)
    const investor = globalState.investors.get(activeInvestor)
    const swaps = usePoolStore((state) => state.swaps)
    const logObjs = useLogsStore((state) => state.logObjs)
    const addLogObj = useLogsStore((state) => state.addLogObj)
    const proMode = useQuestStore((state) => state.proMode)
    const setProMode = useQuestStore((state) => state.setProMode)
    const activeQuest = useQuestStore((state) => state.active)

    const msgs = useRef(null)

    // Reset selected quests and citation range if active quest equal to the one to be cited
    if (selectedQuests.includes(activeQuest)) {
        selectedQuests.splice(activeQuest, 1)
        setSelectedQuests(selectedQuests)
    }

    const handleCiteQuest = () => {
        if (selectedQuests.length <= 0) {
            console.log(`You need to select which quest to cite`)
            msgs.current.show({
                severity: 'warn',
                detail: 'You need to select which quest to cite'
            })
            return
        }

        if (!activeInvestor || !activeQuest) {
            console.log(`You need to select investor and a paper`)
            msgs.current.show({
                severity: 'warn',
                detail: 'You need to select investor and a paper'
            })
            return
        }

        const calcAmountA = Math.floor(
            (investor.balances[activeQuest] / 100) * citationRange
        )
        const cumulativeDeposit = selectedQuests.length * calcAmountA

        if (
            isNaN(calcAmountA) ||
            cumulativeDeposit > investor.balances[activeQuest] ||
            calcAmountA <= 0
        ) {
            console.log(
                `Not enough ${activeQuest} balance to cite selected quest(s)`
            )
            msgs.current.show({
                severity: 'warn',
                detail: `Not enough ${activeQuest} balance to cite selected quest(s)`
            })
            return
        }

        const citingQuest = globalState.quests.get(activeQuest)
        const citingPool = globalState.pools
            .values()
            .find(
                (pool) => pool.tokenRight === citingQuest.name && pool.isQuest()
            )

        selectedQuests.forEach((questName) => {
            if (questName === activeQuest) {
                return
            }

            const poolName = `${activeQuest}-${questName}`
            const invPoolName = `${questName}-${activeQuest}`

            const citedQuest = globalState.quests.get(questName)
            const citedPool = globalState.pools
                .values()
                .find(
                    (pool) =>
                        pool.tokenRight === citedQuest.name && pool.isQuest()
                )

            let crossPool
            let cpExists = false

            if (
                !globalState.pools.has(poolName) &&
                !globalState.pools.has(invPoolName)
            ) {
                const startingPrice = citingPool.curPrice / citedPool.curPrice
                crossPool = investor.createPool(
                    citedQuest,
                    citingQuest,
                    startingPrice
                )
            } else {
                cpExists = true
                crossPool = globalState.pools
                    .values()
                    .find(
                        (pool) =>
                            pool.name === poolName || pool.name === invPoolName
                    )
            }

            const amt0 = activeQuest !== crossPool.tokenLeft ? 0 : calcAmountA
            const amt1 = amt0 === 0 ? calcAmountA : 0

            const priceRange = investor.calculatePriceRange(
                crossPool,
                citedPool,
                citingPool,
                citationMultiplier
            )
            const [totalIn, _] = investor.citeQuest(
                crossPool,
                priceRange.min,
                priceRange.max,
                amt0,
                amt1,
                priceRange.native
            )

            if (!cpExists) {
                citedQuest.addPool(crossPool)
                citingQuest.addPool(crossPool)

                globalState.quests.set(citedQuest.name, citedQuest)
                globalState.quests.set(citingQuest.name, citingQuest)
                globalState.pools.set(crossPool.name, crossPool)
                globalState.poolStore.pools.push(crossPool.name)
                globalState.poolStore.active = crossPool.name
                addPool(crossPool.name)
            }

            setActivePool('')
            setActivePool(crossPool.name)
            investor.addBalance(citingQuest.name, -totalIn)
            globalState.investors.set(investor.hash, investor)
            globalState.investorStore.investors = appendIfNotExist(
                globalState.investorStore.investors,
                investor.hash
            )

            const logData = {
                pool: crossPool.name,
                price: crossPool.curPrice.toFixed(3),
                investorHash: investor.hash,
                action: `CITED`,
                totalAmountIn: calcAmountA
            }
            addLogObj(logData)
            globalState.logStore.logObjs.push(logData)
        })
    }

    const handleModifyParameters = () => {
        setProMode(!proMode)
        globalState.questStore.proMode = !proMode

        if (!proMode) {
            handleCitationRange(5)
        }
    }

    const showParentError = (obj) => {
        console.log('No active investor')
        msgs.current.show(obj)
    }

    return (
        <div>
            <h3>Cited Quests</h3>
            <ScrollPanel className="w-full h-10rem border-1 border-solid border-500 p-3">
                <CitingQuestList
                    selectedQuests={selectedQuests}
                    setSelectedQuests={setSelectedQuests}
                    showParentError={showParentError}
                />
            </ScrollPanel>
            <CitingQuestLiquidity
                selectedQuests={selectedQuests}
                citationRange={citationRange}
                handleCitationRange={handleCitationRange}
                citationMultiplier={citationMultiplier}
                handleCitationMultiplier={handleCitationMultiplier}
            />
            <div className="flex justify-content-center">
                <Button
                    className="p-button-info w-12 mt-2 justify-content-center"
                    onClick={handleCiteQuest}
                >
                    Cite Quest
                </Button>
            </div>
            <div className="flex justify-content-center mt-2">
                <Button
                    className={`${
                        proMode ? 'p-button-outlined' : 'p-button-text'
                    } p-button-secondary`}
                    onClick={handleModifyParameters}
                >
                    Modify Parameters
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
    const activeQuest = useQuestStore((state) => state.active)
    const activeInvestor = useInvestorStore((state) => state.active)
    const msgs = useRef(null)

    const handleQuestSelect = (e) => {
        if (!activeInvestor) {
            props.showParentError({
                severity: 'warn',
                detail: `You need to select investor before trying to cite a quest`
            })
            return
        }

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
        <React.Fragment>
            <div>
                {quests
                    .filter((quest) => quest !== activeQuest)
                    .map((quest, idx) => {
                        const questObj = globalState.quests.get(quest)
                        // @TODO: Reduce

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
        </React.Fragment>
    )
}

export const CitingQuestLiquidity = (props) => {
    const activeInvestor = useInvestorStore((state) => state.active)
    const investor = globalState.investors.get(activeInvestor)
    const activeQuest = useQuestStore((state) => state.active)
    const swaps = usePoolStore((state) => state.swaps)
    const proMode = useQuestStore((state) => state.proMode)
    const msgs = useRef(null)

    if (props.selectedQuests.length <= 0) {
        return
    }

    if (!investor.balances[activeQuest]) {
        return (
            <div className="grid">
                <div className="col-12 mt-2">
                    Not enough {activeQuest} balance to cite any quest
                </div>
            </div>
        )
    }

    const calculatedDeposit =
        activeQuest &&
        activeInvestor &&
        Math.floor((investor.balances[activeQuest] / 100) * props.citationRange)

    const cumulativeDeposit = props.selectedQuests.length * calculatedDeposit

    const shouldNotRender =
        investor.balances[activeQuest] <= 0 ||
        calculatedDeposit < 1 ||
        investor.balances[activeQuest] < calculatedDeposit ||
        cumulativeDeposit > investor.balances[activeQuest]

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
                                        Not enough {activeQuest} balance to cite{' '}
                                        {selectedQuest}
                                    </span>
                                )
                            }

                            return (
                                <span
                                    key={idx}
                                    className="text-green-600 block"
                                >
                                    [#{idx + 1}] Deposit {calculatedDeposit}{' '}
                                    {activeQuest} to cite {selectedQuest}
                                </span>
                            )
                        })}
                    </span>
                </div>
            </div>
            {proMode ? (
                <React.Fragment>
                    <CitationRangeSlider
                        citationRange={props.citationRange}
                        handleCitationRange={props.handleCitationRange}
                        token={activeQuest}
                    />
                    <CitationPriceMultiplier
                        citationMultiplier={props.citationMultiplier}
                        handleCitationMultiplier={
                            props.handleCitationMultiplier
                        }
                    />
                </React.Fragment>
            ) : (
                ''
            )}
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
    const addHumanQuest = useQuestStore((state) => state.addHumanQuest)
    const activeInvestor = useInvestorStore((state) => state.active)
    const quests = useQuestStore((state) => state.quests)
    const addLogObj = useLogsStore((state) => state.addLogObj)
    const setActiveQuest = useQuestStore((state) => state.setActive)
    const setActivePool = usePoolStore((state) => state.setActive)
    const setSwapMode = usePoolStore((state) => state.setSwapMode)

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

        if (isNumericString(questName)) {
            console.log('QuestName should not be a number')
            msgs.current.show({
                severity: 'warn',
                detail: 'Please rename quest. It should not be a number'
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

        // Add new pool to USDC Token
        const exQuest = globalState.quests.get(pool.tokenLeft)
        exQuest.addPool(pool)
        globalState.quests.set(pool.tokenLeft, exQuest)

        // Add Quest and Pool to global state
        globalState.quests.set(tokenRight.name, tokenRight)
        globalState.pools.set(pool.name, pool)

        // Add Quest to state
        addQuest(tokenRight.name)
        // Add Quest to global state store
        globalState.questStore.quests = [
            ...globalState.questStore.quests,
            tokenRight.name
        ]
        // Mark Quest as human-made
        addHumanQuest(tokenRight.name)
        // Add human-made mark to global state
        globalState.questStore.humanQuests = [
            ...globalState.questStore.humanQuests,
            tokenRight.name
        ]
        // Add Pool to state
        addPool(pool.name)
        // Add Pool to global state of pool store
        globalState.poolStore.pools = [
            ...globalState.poolStore.pools,
            pool.name
        ]

        setQuestName('')

        setActiveQuest(questName)
        globalState.questStore.active = questName
        setActivePool(pool.name)
        globalState.poolStore.active = pool.name

        const logData = {
            pool: pool.name,
            investorHash: investor.hash,
            action: `CREATED`
        }
        addLogObj(logData)
        globalState.logStore.logObjs.push(logData)
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

const CitationRangeSlider = (props) => {
    return (
        <React.Fragment>
            <div className="grid">
                <div className="col-12">
                    <span className="text-center block pb-2">
                        {props.citationRange}% of total {props.token}
                    </span>
                    <Slider
                        step={5}
                        value={props.citationRange}
                        onChange={(e) => props.handleCitationRange(e.value)}
                    />
                </div>
            </div>
        </React.Fragment>
    )
}

const CitationPriceMultiplier = (props) => {
    return (
        <React.Fragment>
            <div className="grid">
                <div className="col-12">
                    <span className="text-center block pb-2">
                        Price range: {props.citationMultiplier}
                    </span>
                    <Slider
                        step={1}
                        min={2}
                        max={100}
                        value={props.citationMultiplier}
                        onChange={(e) =>
                            props.handleCitationMultiplier(e.value)
                        }
                    />
                </div>
            </div>
        </React.Fragment>
    )
}
