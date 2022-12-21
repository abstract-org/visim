import create from 'zustand'
import { devtools } from 'zustand/middleware'
import {LogicUtils} from '@abstract-org/sdk'

const INITIAL_STATE = {
    currentDay: 0
}

const devToolsOptions = { name: 'DayTrackerStore' }

const useDayTrackerStore = create(
    devtools(
        (set, get) => ({
            ...INITIAL_STATE,
            incrementDay: (day) =>
                set(
                    () => ({ currentDay: get().currentDay + 1 }),
                    false,
                    'incrementDay'
                ),
            setDay: (day) => set(() => ({ currentDay: day }), false, 'setDay'),
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

export default useDayTrackerStore
