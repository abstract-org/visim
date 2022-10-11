import produce from 'immer'
import create from 'zustand'
import { devtools } from 'zustand/middleware'

import { overrideState } from '../Utils/logicUtils'

const INITIAL_STATE = {
    logObjs: []
}

const useLogsStore = create(
    devtools((set, get) => ({
        ...INITIAL_STATE,
        addLogObj: (logObj) =>
            set(produce((state) => ({ logObjs: [...state.logObjs, logObj] }))),
        override: (newData) =>
            set((state) => overrideState(get(), newData, INITIAL_STATE))
    }))
)

export default useLogsStore
