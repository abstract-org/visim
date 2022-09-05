import create from 'zustand'
import { devtools } from 'zustand/middleware'

const useQuestStore = create(
    devtools((set) => ({
        quests: [],
        selectedQuests: [],
        active: null,
        proMode: false,
        setActive: (quest) => set(() => ({ active: quest })),
        setProMode: (proMode) => set(() => ({ proMode })),
        addQuest: (quest) =>
            set((state) => ({ quests: [...state.quests, quest] })),
        setSelectedQuests: (quests) => set(() => ({ selectedQuests: quests }))
    }))
)

export default useQuestStore
