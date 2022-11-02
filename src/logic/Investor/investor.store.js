import produce from 'immer'
import create from 'zustand'
import { devtools } from 'zustand/middleware'

import { overrideState } from '../Utils/logicUtils'

const INITIAL_STATE = {
    active: null,
    investors: []
}

const devToolsOptions = { name: 'InvestorStore' }

const useInvestorStore = create(
    devtools(
        (set, get) => ({
            ...INITIAL_STATE,
            addInvestor: (hash) =>
                set(
                    produce((state) => ({
                        investors: [...state.investors, hash]
                    }))
                ),
            addMultipleInvestors: (investors) =>
                set(
                    produce((state) => {
                        investors.forEach((investor) => {
                            if (!state.investors.includes(investor)) {
                                state.investors.push(investor)
                            }
                        })
                    })
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
                    active: get().investors.find(
                        (hash) => hash === investorHash
                    )
                }),
            getByHash: (investorHash) =>
                get().investors.find((hash) => hash === investorHash),
            override: (newData) =>
                set(() => overrideState(get(), newData, INITIAL_STATE))
        }),
        devToolsOptions
    )
)

export default useInvestorStore
