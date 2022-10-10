import produce from 'immer'
import create from 'zustand'
import { devtools } from 'zustand/middleware'

const useQuestStore = create(
    devtools((set) => ({
        quests: [],
        humanQuests: [],
        selectedQuests: [],
        active: null,
        proMode: false,
        addQuest: (quest) =>
            set((state) => ({ quests: [...state.quests, quest] })),
        addHumanQuest: (quest) =>
            set((state) => ({ humanQuests: [...state.humanQuests, quest] })),
        setSelectedQuests: (quests) => set(() => ({ selectedQuests: quests })),
        setActive: (quest) => set(() => ({ active: quest })),
        setProMode: (proMode) => set(() => ({ proMode })),
        override: (newData) =>
            set((state) => {
                if (newData) {
                    state.quests = newData.quests || []
                    state.humanQuests = newData.humanQuests || []
                    state.selectedQuests = newData.selectedQuests || []
                    state.active = newData.active
                    state.proMode = !!newData.proMode
                }

                return state
            }),
        addMultipleQuest: (quests) =>
            set(
                produce((state) => ({
                    investors: [...state.quests, ...quests]
                }))
            )
    }))
)

export default useQuestStore
