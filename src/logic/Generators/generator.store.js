import Chance from 'chance'
import create from 'zustand'
import { devtools } from 'zustand/middleware'

const chance = Chance()

const useGeneratorStore = create(
    devtools((set, get) => ({
        invConfigs: [],
        questConfigs: [],
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
            set((state) => {
                if (newData) {
                    state.invConfigs = newData.invConfigs || []
                    state.questConfigs = newData.questConfigs || []
                }

                return state
            })
    }))
)

export default useGeneratorStore
