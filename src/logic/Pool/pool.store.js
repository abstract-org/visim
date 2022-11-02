import produce from 'immer'
import create from 'zustand'
import { devtools } from 'zustand/middleware'

import { overrideState } from '../Utils/logicUtils'

const INITIAL_STATE = {
    pools: [],
    swaps: [],
    active: null,
    swapMode: 'smart'
}

const devToolsOptions = { name: 'PoolStore' }

const usePoolStore = create(
    devtools(
        (set, get) => ({
            ...INITIAL_STATE,
            addPool: (pool) =>
                set((state) => ({ pools: [...state.pools, pool] })),
            addMultiplePools: (pools) =>
                set(
                    produce((state) => {
                        pools.forEach((pool) => {
                            if (!state.pools.includes(pool)) {
                                state.pools.push(pool)
                            }
                        })
                    })
                ),
            addSwap: (swap) =>
                set((state) => ({ swaps: [...state.swaps, swap] })),
            addMultipleSwaps: (swaps) =>
                set(
                    produce((state) => {
                        swaps.forEach((swap) => {
                            if (!state.swaps.includes(swap)) {
                                state.swaps.push(swap)
                            }
                        })
                    })
                ),
            setActive: (pool) => set(() => ({ active: pool })),
            setSwapMode: (mode) => set((state) => ({ swapMode: mode })),
            override: (newData) =>
                set(() => overrideState(get(), newData, INITIAL_STATE))
        }),
        devToolsOptions
    )
)

export default usePoolStore
