import create from 'zustand'
import { devtools } from 'zustand/middleware'

const usePoolStore = create(
    devtools((set) => ({
        active: null,
        pools: [],
        addPool: (pool) => set((state) => ({ pools: [...state.pools, pool] })),
        setActive: (pool) => set(() => ({ active: pool })),
        swaps: [],
        swap: (swap) => set((state) => ({ swaps: [...state.swaps, swap] })),
        valueLinks: [],
        createValueLink: (vl) =>
            set((state) => ({ valueLinks: [...state.valueLinks, vl] }))
    }))
)

export default usePoolStore
