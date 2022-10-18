import create from 'zustand'
import { devtools } from 'zustand/middleware'

import { overrideState } from './Utils/logicUtils'

const INITIAL_STATE = {
    currentDay: 0
}

const devToolsOptions = { name: 'DayTrackerStore' }

const useDayTrackerStore = create(
    devtools(
        (set, get) => ({
            ...INITIAL_STATE,
            setDay: (day) => set(() => ({ currentDay: day })),
            override: (newData) =>
                set(() => overrideState(get(), newData, INITIAL_STATE))
        }),
        devToolsOptions
    )
)

export default useDayTrackerStore
