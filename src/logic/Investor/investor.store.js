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
        addMultipleInvestors: (hashes) =>
            set(
                produce((state) => ({
                    investors: [...state.investors, ...hashes]
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
            get().investors.find((hash) => hash === investorHash),
        override: (newData) =>
            set((state) => {
                let newState = {}
                /*if (newData) {
                    const stateObj = get()
                    Object.entries(newData).forEach((entry) => {
                        if (stateObj[entry[0]] && newData[entry[0]]) {
                            newState[entry[0]] = entry[1]
                        }
                    })
                }

                return newState*/
                console.log(newData)
                if (newData) {
                    console.log(newData)
                    newState.investors = newData.investors || []
                    newState.active = newData.active || null
                }

                return newState
            })
    }))
)

export default useInvestorStore
