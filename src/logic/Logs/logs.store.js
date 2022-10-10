import produce from 'immer'
import create from 'zustand'
import { devtools } from 'zustand/middleware'

const useLogsStore = create(
    devtools((set, get) => ({
        logObjs: [],
        addLogObj: (logObj) =>
            set(produce((state) => ({ logObjs: [...state.logObjs, logObj] }))),
        override: (logsList) =>
            set((state) => {
                state.logObjs = logsList
                return state
            })
    }))
)

export default useLogsStore
