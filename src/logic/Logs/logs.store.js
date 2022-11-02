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
                    })),
                    false,
                    'addLogObj'
                ),
            addMultipleLogs: (logs) =>
                set(
                    produce((state) => {
                        logs.forEach((log) => {
                            if (!state.logObjs.includes(log)) {
                                state.logObjs.push(log)
                            }
                        })
                    }),
                    false,
                    'addMultipleLogs'
                ),
            override: (newData) =>
                set(
                    () => overrideState(get(), newData, INITIAL_STATE),
                    false,
                    'override'
                )
        }),
        devToolsOptions
    )
)

export default useLogsStore
