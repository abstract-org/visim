import create from 'zustand'
import { devtools } from 'zustand/middleware'

import { overrideState } from '../Utils/logicUtils'

const INITIAL_STATE = {
    invConfigs: [],
    questConfigs: [],
    scenarioId: 0,
    needScrollUp: false
}

const devToolsOptions = { name: 'GeneratorStore' }

const useGeneratorStore = create(
    devtools(
        (set, get) => ({
            ...INITIAL_STATE,
            setScenarioId: (scenarioId) =>
                set(() => ({ scenarioId }), false, 'setScenarioId'),
            addInvConfig: (stateConfig) =>
                set(
                    (state) => ({
                        invConfigs: [
                            ...state.invConfigs,
                            {
                                ...stateConfig
                            }
                        ]
                    }),
                    false,
                    'addInvConfig'
                ),
            updateInvConfig: (stateConfig) =>
                set(
                    (state) => ({
                        invConfigs: state.invConfigs.map((gen) => {
                            if (gen.invGenAlias === stateConfig.invGenAlias) {
                                return {
                                    ...stateConfig
                                }
                            } else {
                                return gen
                            }
                        })
                    }),
                    false,
                    'updateInvConfig'
                ),
            deleteInvConfig: (invGenAlias) =>
                set((state) => ({
                    invConfigs: state.invConfigs.filter(
                        (gen) => gen.invGenAlias !== invGenAlias
                    )
                })),
            resetInvConfigs: () =>
                set((state) => ({ invConfigs: [] }), false, 'resetInvConfigs'),
            addQuestConfig: (stateConfig) =>
                set(
                    (state) => ({
                        questConfigs: [
                            ...state.questConfigs,
                            {
                                ...stateConfig
                            }
                        ]
                    }),
                    false,
                    'addQuestConfig'
                ),
            updateQuestConfig: (stateConfig) =>
                set(
                    (state) => ({
                        questConfigs: state.questConfigs.map((gen) => {
                            if (
                                gen.questGenAlias === stateConfig.questGenAlias
                            ) {
                                return {
                                    ...stateConfig
                                }
                            } else {
                                return gen
                            }
                        })
                    }),
                    false,
                    'updateQuestConfig'
                ),
            deleteQuestConfig: (questGenAlias) =>
                set(
                    (state) => ({
                        questConfigs: state.questConfigs.filter(
                            (gen) => gen.questGenAlias !== questGenAlias
                        )
                    }),
                    false,
                    'deleteQuestConfig'
                ),
            resetQuestConfigs: () =>
                set(() => ({ questConfigs: [] }), false, 'resetQuestConfigs'),
            setNeedScrollUp: (needScrollUp) =>
                set(() => ({ needScrollUp }), false, 'setNeedScrollUp'),
            override: (newData) =>
                set(
                    () => overrideState(get(), newData, INITIAL_STATE),
                    false,
                    'override'
                )
        }),
        devToolsOptions
    )
)

export default useGeneratorStore
