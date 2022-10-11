import Chance from 'chance'
import create from 'zustand'
import { devtools } from 'zustand/middleware'

import { overrideState } from '../Utils/logicUtils'

const chance = Chance()

const INITIAL_STATE = {
    invConfigs: [],
    questConfigs: [],
    scenarioId: 0
}

const useGeneratorStore = create(
    devtools((set, get) => ({
        ...INITIAL_STATE,
        setScenarioId: (scenarioId) => set((state) => ({ scenarioId })),
        addInvConfig: (stateConfig) =>
            set((state) => ({
                invConfigs: [
                    ...state.invConfigs,
                    {
                        ...stateConfig
                    }
                ]
            })),
        updateInvConfig: (stateConfig) =>
            set((state) => ({
                invConfigs: state.invConfigs.map((gen) => {
                    if (gen.invGenAlias === stateConfig.invGenAlias) {
                        return {
                            ...stateConfig
                        }
                    } else {
                        return gen
                    }
                })
            })),
        deleteInvConfig: (invGenAlias) =>
            set((state) => ({
                invConfigs: state.invConfigs.filter(
                    (gen) => gen.invGenAlias !== invGenAlias
                )
            })),
        resetInvConfigs: () => set((state) => ({ invConfigs: [] })),
        addQuestConfig: (stateConfig) =>
            set((state) => ({
                questConfigs: [
                    ...state.questConfigs,
                    {
                        ...stateConfig
                    }
                ]
            })),
        updateQuestConfig: (stateConfig) =>
            set((state) => ({
                questConfigs: state.questConfigs.map((gen) => {
                    if (gen.questGenAlias === stateConfig.questGenAlias) {
                        return {
                            ...stateConfig
                        }
                    } else {
                        return gen
                    }
                })
            })),
        deleteQuestConfig: (questGenAlias) =>
            set((state) => ({
                questConfigs: state.questConfigs.filter(
                    (gen) => gen.questGenAlias !== questGenAlias
                )
            })),
        resetQuestConfigs: () => set((state) => ({ questConfigs: [] })),
        override: (newData) =>
            set((state) => overrideState(get(), newData, INITIAL_STATE))
    }))
)

export default useGeneratorStore
