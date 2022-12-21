import produce, { setAutoFreeze } from 'immer'
import create from 'zustand'
import { devtools } from 'zustand/middleware'
import {LogicUtils} from '@abstract-org/sdk'

setAutoFreeze(false)

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
                            state.logObjs.push(log)
                        })
                    }),
                    false,
                    'addMultipleLogs'
                ),
            overrideSwaps: (logObjs) =>
                set((state) => ({ logObjs: [...logObjs] })),
            override: (newData) =>
                set(
                    () => LogicUtils.overrideState(get(), newData, INITIAL_STATE),
                    false,
                    'override'
                )
        }),
        devToolsOptions
    )
)

export default useLogsStore
