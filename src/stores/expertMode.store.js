import produce, { setAutoFreeze } from 'immer'
import create from 'zustand'
import { devtools } from 'zustand/middleware'

setAutoFreeze(false)

const INITIAL_STATE = {
    isExpert: false
}

const devToolsOptions = { name: 'ExpertModeStore' }

const useExpertModeStore = create(
    devtools(
        (set, get) => ({
            ...INITIAL_STATE,
            setExpertMode: (isExpert) =>
                set(
                    produce(() => ({
                        isExpert
                    })),
                    false,
                    'setExpertMode'
                )
        }),
        devToolsOptions
    )
)

export default useExpertModeStore
