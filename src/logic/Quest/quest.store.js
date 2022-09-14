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
        setActive: (quest) => set(() => ({ active: quest })),
        setProMode: (proMode) => set(() => ({ proMode })),
        addQuest: (quest) =>
            set((state) => ({ quests: [...state.quests, quest] })),
        addMultipleQuest: (quests) =>
            set(
                produce((state) => ({
                    investors: [...state.quests, ...quests]
                }))
            ),
        addHumanQuest: (quest) =>
            set((state) => ({ humanQuests: [...state.humanQuests, quest] })),
        setSelectedQuests: (quests) => set(() => ({ selectedQuests: quests }))
    }))
)

export default useQuestStore
