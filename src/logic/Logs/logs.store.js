import produce from 'immer'
import create from 'zustand'
import { devtools } from 'zustand/middleware'

import { overrideState } from '../Utils/logicUtils'

const INITIAL_STATE = {
    logObjs: []
}

const devToolsOptions = { name: 'LogsStore' }

const useLogsStore = create(
    devtools(
        (set, get) => ({
            ...INITIAL_STATE,
            addLogObj: (logObj) =>
                set(
                    produce((state) => ({
                        logObjs: [...state.logObjs, logObj]
                    }))
                ),
            addMultipleLogs: (logs) =>
                set(
                    produce((state) => {
                        logs.forEach((log) => {
                            if (!state.logObjs.includes(log)) {
                                state.logObjs.push(log)
                            }
                        })
                    })
                ),
            override: (newData) =>
                set(() => overrideState(get(), newData, INITIAL_STATE))
        }),
        devToolsOptions
    )
)

export default useLogsStore
