import { LogicUtils } from '@abstract-org/sdk'
import produce, { setAutoFreeze } from 'immer'
import create from 'zustand'
import { devtools } from 'zustand/middleware'

setAutoFreeze(false)

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
                set(
                    (state) => ({ pools: [...state.pools, pool] }),
                    false,
                    'addPool'
                ),
            addMultiplePools: (pools) =>
                set(
                    produce((state) => {
                        pools.forEach((pool) => {
                            if (!state.pools.includes(pool)) {
                                state.pools.push(pool)
                            }
                        })
                    }),
                    false,
                    'addMultiplePools'
                ),
            addSwap: (swap) =>
                set(
                    (state) => ({ swaps: [...state.swaps, swap] }),
                    false,
                    'addSwap'
                ),
            addMultipleSwaps: (swaps) =>
                set(
                    produce((state) => {
                        swaps.forEach((swap) => {
                            state.swaps.push(swap)
                        })
                    }),
                    false,
                    'addMultipleSwaps'
                ),
            setActive: (pool) =>
                set(() => ({ active: pool }), false, 'setActive'),
            setSwapMode: (mode) =>
                set((state) => ({ swapMode: mode }), false, 'setSwapMode'),
            override: (newData) =>
                set(
                    () =>
                        LogicUtils.overrideState(get(), newData, INITIAL_STATE),
                    false,
                    'override'
                )
        }),
        devToolsOptions
    )
)

export default usePoolStore
