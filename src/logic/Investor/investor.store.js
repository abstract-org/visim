import produce from 'immer'
import create from 'zustand'
import { devtools } from 'zustand/middleware'

const useInvestorStore = create(
    devtools((set, get) => ({
        active: null,
        investors: [],
        addInvestor: (hash) =>
            set(
                produce((state) => ({
                    investors: [...state.investors, hash]
                }))
            ),
        addInvestors: (investorsList) =>
            set(
                produce((state) => {
                    investorsList.forEach((hash) => {
                        if (!get().investors.find((i) => i === hash)) {
                            state.investors.push(hash)
                        }
                    })
                })
            ),
        setActive: (investorHash) =>
            set({
                active: get().investors.find((hash) => hash === investorHash)
            }),
        getByHash: (investorHash) =>
            get().investors.find((hash) => hash === investorHash)
    }))
)

export default useInvestorStore
