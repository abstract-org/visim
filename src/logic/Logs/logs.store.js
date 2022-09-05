import create from 'zustand'
import produce from 'immer'
import { devtools } from 'zustand/middleware'

const useLogsStore = create(
    devtools((set, get) => ({
        active: null,
        logs: [],
        addLog: (log) =>
            set(produce((state) => ({ logs: [...state.logs, log] })))
    }))
)

export default useLogsStore
