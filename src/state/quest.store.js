import create from 'zustand';
import {devtools} from 'zustand/middleware';

const useQuestStore = create(devtools((set, get) => ({
    quests: [],
    selectedQuests: [],
    addQuest: (quest) => set((state) => (
        {quests: [...state.quests, quest]}
    )),
    setSelectedQuests: (quests) => set(() => (
        {selectedQuests: quests}
    ))
})))

export default (useQuestStore);