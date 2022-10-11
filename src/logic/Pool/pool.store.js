import produce from 'immer'
import create from 'zustand'
import { devtools } from 'zustand/middleware'

import { overrideState } from '../Utils/logicUtils'

const INITIAL_STATE = {
    pools: [],
    swaps: [],
    valueLinks: [],
    active: null,
    swapMode: 'smart'
}

const usePoolStore = create(
    devtools((set, get) => ({
        ...INITIAL_STATE,
        addPool: (pool) => set((state) => ({ pools: [...state.pools, pool] })),
        addSwap: (swap) => set((state) => ({ swaps: [...state.swaps, swap] })),
        createValueLink: (vl) =>
            set((state) => ({ valueLinks: [...state.valueLinks, vl] })),
        setActive: (pool) => set(() => ({ active: pool })),
        setSwapMode: (mode) => set((state) => ({ swapMode: mode })),
        override: (newData) =>
            set(() => overrideState(get(), newData, INITIAL_STATE)),
        addMultiplePools: (pools) =>
            set(
                produce((state) => ({
                    investors: [...state.pools, ...pools]
                }))
            )
    }))
)

export default usePoolStore
