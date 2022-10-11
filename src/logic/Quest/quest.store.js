import produce from 'immer'
import create from 'zustand'
import { devtools } from 'zustand/middleware'

import { overrideState } from '../Utils/logicUtils'

const INITIAL_STATE = {
    quests: [],
    humanQuests: [],
    selectedQuests: [],
    active: null,
    proMode: false
}
const useQuestStore = create(
    devtools((set, get) => ({
        ...INITIAL_STATE,
        addQuest: (quest) =>
            set((state) => ({ quests: [...state.quests, quest] })),
        addHumanQuest: (quest) =>
            set((state) => ({ humanQuests: [...state.humanQuests, quest] })),
        setSelectedQuests: (quests) => set(() => ({ selectedQuests: quests })),
        setActive: (quest) => set(() => ({ active: quest })),
        setProMode: (proMode) => set(() => ({ proMode })),
        override: (newData) =>
            set(() => overrideState(get(), newData, INITIAL_STATE)),
        addMultipleQuest: (quests) =>
            set(
                produce((state) => ({
                    investors: [...state.quests, ...quests]
                }))
            )
    }))
)

export default useQuestStore
