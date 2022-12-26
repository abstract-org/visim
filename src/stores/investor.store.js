import { LogicUtils } from '@abstract-org/sdk'
import produce, { setAutoFreeze } from 'immer'
import create from 'zustand'
import { devtools } from 'zustand/middleware'

setAutoFreeze(false)

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
                    })),
                    false,
                    'addInvestor'
                ),
            addMultipleInvestors: (investors) =>
                set(
                    produce((state) => {
                        investors.forEach((investor) => {
                            if (!state.investors.includes(investor)) {
                                state.investors.push(investor)
                            }
                        })
                    }),
                    false,
                    'addMultipleInvestors'
                ),
            addInvestors: (investorsList) =>
                set(
                    produce((state) => {
                        investorsList.forEach((hash) => {
                            if (!get().investors.find((i) => i === hash)) {
                                state.investors.push(hash)
                            }
                        })
                    }),
                    false,
                    'addInvestors'
                ),
            setActive: (investorHash) =>
                set(
                    {
                        active: get().investors.find(
                            (hash) => hash === investorHash
                        )
                    },
                    false,
                    'setActive'
                ),
            getByHash: (investorHash) =>
                get().investors.find((hash) => hash === investorHash),
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

export default useInvestorStore
