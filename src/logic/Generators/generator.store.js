import create from 'zustand'
import { devtools } from 'zustand/middleware'

const useGeneratorStore = create(
    devtools((set, get) => ({
        invConfigs: [],
        questConfigs: [],
        addInvConfig: (stateConfig) =>
            set((state) => ({
                invConfigs: [
                    {
                        id: get().invConfigs.length + 1,
                        ...stateConfig
                    },
                    ...state.invConfigs
                ]
            })),
        updateInvConfig: (stateConfig) =>
            set((state) => ({
                invConfigs: state.invConfigs.map((gen) => {
                    if (gen.id === stateConfig.id) {
                        return {
                            ...stateConfig
                        }
                    } else {
                        return gen
                    }
                })
            })),
        deleteInvConfig: (index) =>
            set((state) => ({
                invConfigs: state.invConfigs.filter((gen) => gen.id !== index)
            })),
        addQuestConfig: (stateConfig) =>
            set((state) => ({
                questConfigs: [
                    {
                        id: get().questConfigs.length + 1,
                        ...stateConfig
                    },
                    ...state.questConfigs
                ]
            })),
        updateQuestConfig: (stateConfig) =>
            set((state) => ({
                questConfigs: state.questConfigs.map((gen) => {
                    if (gen.id === stateConfig.id) {
                        return {
                            ...stateConfig
                        }
                    } else {
                        return gen
                    }
                })
            })),
        deleteQuestConfig: (index) =>
            set((state) => ({
                questConfigs: state.questConfigs.filter(
                    (gen) => gen.id !== index
                )
            }))
    }))
)

export default useGeneratorStore
