import produce from 'immer'
import create from 'zustand'
import { devtools } from 'zustand/middleware'

const usePoolStore = create(
    devtools((set) => ({
        pools: [],
        swaps: [],
        valueLinks: [],
        active: null,
        swapMode: 'smart',
        addPool: (pool) => set((state) => ({ pools: [...state.pools, pool] })),
        addSwap: (swap) => set((state) => ({ swaps: [...state.swaps, swap] })),
        createValueLink: (vl) =>
            set((state) => ({ valueLinks: [...state.valueLinks, vl] })),
        setActive: (pool) => set(() => ({ active: pool })),
        setSwapMode: (mode) => set((state) => ({ swapMode: mode })),
        override: (newData) =>
            set((state) => {
                if (newData) {
                    state.pools = newData.pools || []
                    state.swaps = newData.swaps || []
                    state.valueLinks = newData.valueLinks || []
                    state.active = newData.active || null
                    state.swapMode = newData.swapMode || 'smart'
                }

                return state
            }),
        addMultiplePools: (pools) =>
            set(
                produce((state) => ({
                    investors: [...state.pools, ...pools]
                }))
            )
    }))
)

export default usePoolStore
