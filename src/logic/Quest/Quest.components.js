import { globals } from 'chance/.eslintrc'
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
    const [selectedQuests, setSelectedQuests] = useState([])
    const handleCitationRange = (value) => setCitationRange(value)
    const activeInvestor = useInvestorStore((state) => state.active)
    const setActivePool = usePoolStore((state) => state.setActive)
    const addPool = usePoolStore((state) => state.addPool)
    const investor = globalState.investors.get(activeInvestor)
    const swaps = usePoolStore((state) => state.swaps)
    const createValueLink = usePoolStore((state) => state.createValueLink)
    const addLogObj = useLogsStore((state) => state.addLogObj)
    const proMode = useQuestStore((state) => state.proMode)
    const setProMode = useQuestStore((state) => state.setProMode)
    const activeQuest = useQuestStore((state) => state.active)

    const msgs = useRef(null)

    // Reset selected quests and citation range if active quest equal to the one to be cited
    if (selectedQuests.includes(activeQuest)) {
        selectedQuests.splice(activeQuest, 1)
        setSelectedQuests(selectedQuests)
        globalState.questStore.selectedQuests = selectedQuests || []
        // FIXME: might be not needed here - seem like selectedQuests are not being updated in zustand
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
            const swapPoolName = `${questName}-${activeQuest}`
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
            const citedPool = globalState.pools
                .values()
                .find(
                    (pool) =>
                        pool.tokenRight === citedQuest.name && pool.isQuest()
                )
            const crossPool = investor.createPool(citedQuest, citingQuest)
            const priceRange = investor.calculatePriceRange(
                citingPool,
                citedPool
            )
            investor.citeQuest(
                crossPool,
                priceRange.min,
                priceRange.max,
                calcAmountA
            )
            citedQuest.addPool(crossPool)
            citingQuest.addPool(crossPool)
            globalState.quests.set(citedQuest.name, citedQuest)
            globalState.quests.set(citingQuest.name, citingQuest)
            investor.addBalance(citingQuest.name, -calcAmountA)

            globalState.pools.set(crossPool.name, crossPool)
            addPool(crossPool.name)
            globalState.poolStore.pools.push(crossPool.name)
            const valueLink = {
                investor: investor.hash,
                vl: crossPool.name,
                initialAmount: calcAmountA,
                initialToken: citingQuest.name
            }
            createValueLink(valueLink)
            globalState.poolStore.valueLinks.push(valueLink)
            setActivePool(crossPool.name)
            globalState.poolStore.active = crossPool.name

            const logData = {
                pool: crossPool.name,
                investorHash: investor.hash,
                action: `CITED`,
                totalAmountIn: calcAmountA
            }
            addLogObj(logData)
            globalState.logStore.push(logData)
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
            <h3>Citing Quests</h3>
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
                <CitationRangeSlider
                    citationRange={props.citationRange}
                    handleCitationRange={props.handleCitationRange}
                    token={activeQuest}
                />
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

        // Add USDC to pools
        const exQuest = globalState.quests.get(pool.tokenLeft)
        exQuest.addPool(pool)
        globalState.quests.set(pool.tokenLeft, exQuest)

        globalState.quests.set(tokenRight.name, tokenRight)
        globalState.pools.set(pool.name, pool)
        addQuest(tokenRight.name)
        globalState.questStore.quests.push(tokenRight.name)
        addHumanQuest(tokenRight.name)
        globalState.questStore.humanQuests.push(tokenRight.name)
        addPool(pool.name)
        globalState.poolStore.pools.push(pool.name)

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
        globalState.logStore.push(logData)
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
        <div>
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
        </div>
    )
}
