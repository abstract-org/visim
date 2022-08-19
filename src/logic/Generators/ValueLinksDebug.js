import globalState from "../GlobalState"
import Investor from "../Investor/Investor.class"
import { faker } from '@faker-js/faker'
import useInvestorStore from "../Investor/investor.store"
import usePoolStore from "../Pool/pool.store"
import useQuestStore from "../Quest/quest.store"
import { useMemo } from "react"

const addInvestorsSelector = state => state.addInvestors
const setActiveSelector = state => state.setActive
const setActivePoolSelector = state => state.setActive
const setActiveQuestSelector = state => state.setActive
const addPoolSelector = state => state.addPool
const addQuestSelector = state => state.addQuest

export const ValueLinksDebug = () => {
    const addInvestors = useInvestorStore(addInvestorsSelector)
    const setActiveInvestor = useInvestorStore(setActiveSelector)
    const setActivePool = usePoolStore(setActivePoolSelector)
    const setActiveQuest = useQuestStore(setActiveQuestSelector)
    const addPool = usePoolStore(addPoolSelector)
    const addQuest = useQuestStore(addQuestSelector)

    const initValues = useMemo(() => initValueLinksForDebug(
        addInvestors,
        setActiveInvestor,
        setActivePool,
        setActiveQuest,
        addPool,
        addQuest
    ), [
        addInvestors,
        setActiveInvestor,
        setActivePool,
        setActiveQuest,
        addPool,
        addQuest
    ])

    return <div>{initValues}</div>
}



const initValueLinksForDebug = (
    addInvestors,
    setActiveInvestor,
    setActivePool,
    setActiveQuest,
    addPool,
    addQuest
) => {
    if (globalState.investors.count() > 0) {
        return
    }

    const creator = new Investor(1, 10000, "creator")
    globalState.investors.set(creator.hash, creator)

    addInvestors([creator.hash])
    setActiveInvestor(creator.hash)

    // Init USDC pools
    Array.from({ length: 3 }).forEach(() => {
        const quest = creator.createQuest(faker.name.firstName().toUpperCase())
        const pool = quest.createPool()
        
        quest.addPool(pool)
        quest.initializePoolPositions(pool)
        
        globalState.quests.set(quest.name, quest)
        globalState.pools.set(pool.name, pool)

        addPool(pool.name)
        addQuest(quest.name)
    })

    // Create value links
    Array.from({ length: 5 }).forEach(() => {
        const citingQuest = creator.createQuest(faker.name.firstName().toUpperCase())
        const citedQuestId = Math.floor(Math.random() * globalState.quests.count())
        const citedQuest = globalState.quests.get( globalState.quests.keys()[citedQuestId] )

        // Creating USDC pool for new quest
        const defaultPool = citingQuest.createPool()
        citingQuest.initializePoolPositions(defaultPool)
        citingQuest.addPool(defaultPool)
        
        // Update state
        globalState.quests.set(citingQuest.name, citingQuest)
        globalState.pools.set(defaultPool.name, defaultPool)
        
        addPool(defaultPool.name)
        addQuest(citingQuest.name)

        // Creating value link pool
        const pool = citedQuest.createPool(citingQuest)
        citingQuest.addPool(pool)
        citedQuest.addPool(pool)

        // Set "positions" for value link pools
        const priceMin = 1
        const priceMax = 10

        // Open positions for tA<>tB
        let liquidity = pool.getLiquidityForAmounts(
            1000,
            0,
            Math.sqrt(priceMin),
            Math.sqrt(priceMax),
            Math.sqrt(pool.currentPrice)
        )

        pool.setPositionSingle(priceMin, liquidity)
        pool.setPositionSingle(priceMax, -liquidity)

        // Update state
        globalState.pools.set(pool.name, pool)

        addPool(pool.name)
    })
}