import HashMap from 'hashmap'

// This is not a state, just an array of:
// pools, tokens, investors
// Storing those in a state management like Zustand
// Will not trigger UI update as they are not passed by reference, but copies are being created(!?)
// Move to state management once the active phase of development is done
// Forgive me Charles Babbage for this atrocity

const globalState = {
    pools: new HashMap(),
    quests: new HashMap(), // tokens
    investors: new HashMap(),
    logStore: {
        logObjs: []
    },
    questStore: {
        quests: [],
        humanQuests: [],
        selectedQuests: [],
        active: null,
        proMode: false
    },
    poolStore: {
        pools: [],
        swaps: [],
        active: null,
        swapMode: 'smart'
    },
    investorStore: {
        investors: [],
        active: null
    },
    generatorStore: {
        invConfigs: [],
        questConfigs: []
    },
    dayTrackerStore: {
        currentDay: 0
    },
    historical: {
        investorNavs: {}, // { [day:number]: Record<invHash:string,invNav:number> }
        investorBalances: {} // { [day]: Record<investorHash,balances:Object>}
        // poolData by day
    },
    moneyDist: {
        citing: [],
        buying: [],
        selling: [],
        buyingSmart: [],
        sellingSmart: []
    }
}

window.globalState = globalState

export default globalState
