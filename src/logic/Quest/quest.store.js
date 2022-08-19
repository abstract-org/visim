import create from 'zustand';
import {devtools} from 'zustand/middleware';

const useQuestStore = create(devtools((set) => ({
    quests: [],
    selectedQuests: [],
    active: null,
    setActive: (quest) => set(() => (
        {active: quest}
    )),
    addQuest: (quest) => set((state) => ({quests: [...state.quests, quest]})),
    setSelectedQuests: (quests) => set(() => (
        {selectedQuests: quests}
    ))
})))

export default useQuestStore