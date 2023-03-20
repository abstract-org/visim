import produce, { setAutoFreeze } from 'immer'
import create from 'zustand'
import { devtools } from 'zustand/middleware'

setAutoFreeze(false)

const INITIAL_STATE = {
    positions: []
}

const devToolsOptions = { name: 'PositionConfigStore' }

const usePositionConfigStore = create(
    devtools(
        (set, get) => ({
            ...INITIAL_STATE,
            getEnabledPositions: () => get().positions.filter((p) => p.enabled),
            addPosition: (pos) =>
                set(
                    produce((state) => {
                        state.positions.push(pos)
                    }),
                    false,
                    'addPosition'
                ),
            removePosition: (index) =>
                set(
                    produce((state) => {
                        state.positions.splice(index, 1)
                    }),
                    false,
                    'removePosition'
                ),
            togglePosition: (index) =>
                set(
                    produce((state) => {
                        state.positions[index].enabled =
                            !state.positions[index].enabled
                    }),
                    false,
                    'togglePosition'
                ),
            editPosition: (index, changes) =>
                set(
                    produce((state) => {
                        Object.assign(state.positions[index], changes)
                    }),
                    false,
                    'editPosition'
                )
        }),
        devToolsOptions
    )
)

export default usePositionConfigStore
