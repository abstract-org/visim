import produce, { setAutoFreeze } from 'immer'
import create from 'zustand'
import { devtools } from 'zustand/middleware'
import {LogicUtils} from '@abstract-org/sdk'

setAutoFreeze(false)

const INITIAL_STATE = {
    quests: [],
    humanQuests: [],
    selectedQuests: [],
    active: null,
    proMode: false
}

const devToolsOptions = { name: 'QuestStore' }

const useQuestStore = create(
    devtools(
        (set, get) => ({
            ...INITIAL_STATE,
            addQuest: (quest) =>
                set(
                    (state) => ({ quests: [...state.quests, quest] }),
                    false,
                    'addQuest'
                ),
            addMultipleQuests: (quests) =>
                set(
                    produce((state) => {
                        quests.forEach((quest) => {
                            if (!state.quests.includes(quest)) {
                                state.quests.push(quest)
                            }
                        })
                    }),
                    false,
                    'addMultipleQuests'
                ),
            addHumanQuest: (quest) =>
                set(
                    (state) => ({
                        humanQuests: [...state.humanQuests, quest]
                    }),
                    false,
                    'addHumanQuest'
                ),
            setSelectedQuests: (quests) =>
                set(
                    () => ({ selectedQuests: quests }),
                    false,
                    'setSelectedQuests'
                ),
            setActive: (quest) =>
                set(() => ({ active: quest }), false, 'setActive'),
            setProMode: (proMode) =>
                set(() => ({ proMode }), false, 'setProMode'),
            override: (newData) =>
                set(
                    () => LogicUtils.overrideState(get(), newData, INITIAL_STATE),
                    false,
                    'override'
                ),
            addMultipleQuest: (quests) =>
                set(
                    produce((state) => ({
                        investors: [...state.quests, ...quests]
                    })),
                    false,
                    'addMultipleQuest'
                )
        }),
        devToolsOptions
    )
)

export default useQuestStore
