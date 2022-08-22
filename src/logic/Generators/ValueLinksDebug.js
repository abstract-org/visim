import globalConfig from '../config.global.json'
import globalState from '../GlobalState'
import Investor from '../Investor/Investor.class'
import { faker } from '@faker-js/faker'
import useInvestorStore from '../Investor/investor.store'
import usePoolStore from '../Pool/pool.store'
import useQuestStore from '../Quest/quest.store'
import { useMemo } from 'react'
import useLogsStore from '../Logs/logs.store'

const addInvestorsSelector = (state) => state.addInvestors
const setActiveSelector = (state) => state.setActive
const setActivePoolSelector = (state) => state.setActive
const setActiveQuestSelector = (state) => state.setActive
const addPoolSelector = (state) => state.addPool
const addQuestSelector = (state) => state.addQuest
const addLogSelector = (state) => state.addLog

export const ValueLinksDebug = () => {
    const addInvestors = useInvestorStore(addInvestorsSelector)
    const setActiveInvestor = useInvestorStore(setActiveSelector)
    const setActivePool = usePoolStore(setActivePoolSelector)
    const setActiveQuest = useQuestStore(setActiveQuestSelector)
    const addPool = usePoolStore(addPoolSelector)
    const addQuest = useQuestStore(addQuestSelector)
    const addLog = useLogsStore(addLogSelector)

    const initValues = useMemo(
        () =>
            initValueLinksForDebug(
                addInvestors,
                setActiveInvestor,
                setActivePool,
                setActiveQuest,
                addPool,
                addQuest,
                addLog
            ),
        [
            addInvestors,
            setActiveInvestor,
            setActivePool,
            setActiveQuest,
            addPool,
            addQuest,
            addLog
        ]
    )

    return <div>{initValues}</div>
}

const initValueLinksForDebug = (
    addInvestors,
    setActiveInvestor,
    setActivePool,
    setActiveQuest,
    addPool,
    addQuest,
    addLog
) => {
    if (globalState.investors.count() > 0) {
        return
    }

    const creator = new Investor(1, 30000, 'creator')
    globalState.investors.set(creator.hash, creator)

    addInvestors([creator.hash])
    setActiveInvestor(creator.hash)

    // Init USDC pools
    Array.from({ length: 3 }).forEach(() => {
        const quest = creator.createQuest(faker.name.firstName().toUpperCase())
        const pool = quest.createPool()

        addLog(
            `[AGENT] ${quest.name} activated by investor ${creator.type} (${creator.id})`
        )

        quest.addPool(pool)
        quest.initializePoolPositions(pool, globalConfig.INITIAL_LIQUIDITY)

        globalState.quests.set(quest.name, quest)
        globalState.pools.set(pool.name, pool)

        addPool(pool.name)
        addQuest(quest.name)

        globalConfig.INITIAL_LIQUIDITY.forEach((pos) => {
            addLog(
                `[AGENT] ${pos.tokenLeftAmount} ${pool.tokenLeft.name} and ${pos.tokenRightAmount} ${pool.tokenRight.name} added liquidity at price range [${pos.priceMin}...${pos.priceMax}]`
            )
        })
    })

    // Create value links
    Array.from({ length: 5 }).forEach(() => {
        const citingQuest = creator.createQuest(
            faker.name.firstName().toUpperCase()
        )
        const citedQuestId = Math.floor(
            Math.random() * globalState.quests.count()
        )
        const citedQuest = globalState.quests.get(
            globalState.quests.keys()[citedQuestId]
        )

        addLog(
            `[AGENT] ${citingQuest.name} activated by investor ${creator.type} (${creator.id})`
        )

        // Creating USDC pool for new quest
        const defaultPool = citingQuest.createPool()
        citingQuest.initializePoolPositions(defaultPool)
        citingQuest.addPool(defaultPool)

        globalConfig.INITIAL_LIQUIDITY.forEach((pos) => {
            addLog(
                `[AGENT] ${pos.tokenLeftAmount} ${defaultPool.tokenLeft.name} and ${pos.tokenRightAmount} ${defaultPool.tokenRight.name} added liquidity at price range [${pos.priceMin}...${pos.priceMax}]`
            )
        })

        // Update state
        globalState.quests.set(citingQuest.name, citingQuest)
        globalState.pools.set(defaultPool.name, defaultPool)

        addPool(defaultPool.name)
        addQuest(citingQuest.name)

        // Creating value link pool
        const priceMin = 1
        const priceMax = 10
        const defaultTokenASum = 1000

        const vlPool = creator.citeQuest(
            citingQuest,
            citedQuest,
            priceMin,
            priceMax,
            defaultTokenASum,
            0
        )

        addLog(
            `[AGENT] ${vlPool.name} value-link pool created by ${creator.type} (${creator.id})`
        )
        addLog(
            `[AGENT] ${citingQuest.name} cited ${citedQuest.name} and opened position with ${defaultTokenASum} ${vlPool.tokenLeft.name} and a price range [${priceMin}...${priceMax}] by ${creator.type} (${creator.id})`
        )

        vlPool.buy(0.000000001)

        // Update state
        globalState.pools.set(vlPool.name, vlPool)

        addPool(vlPool.name)
    })
}