import produce from 'immer'
import create from 'zustand'
import { devtools } from 'zustand/middleware'

const useLogsStore = create(
    devtools((set, get) => ({
        active: null,
        logs: [],
        logObjs: [],
        addLog: (log) =>
            set(produce((state) => ({ logs: [...state.logs, log] }))),
        addLogObj: (logObj) =>
            set(produce((state) => ({ logObjs: [...state.logObjs, logObj] })))
    }))
)

export default useLogsStore
