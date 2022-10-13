import produce from 'immer'
import create from 'zustand'
import { devtools } from 'zustand/middleware'

import { overrideState } from '../Utils/logicUtils'

/* state.scenarios example (Object instead of Array):
    {
        scenarioId1: {
            scenarioId: scenarioId1,
            invConfigs: invConfigs1,
            questConfigs: questConfigs1
        },
        scenarioId2: {
            invConfigs: nvConfigs2,
            questConfigs: questConfigs2
        },
        ....
    }
 */

const INITIAL_STATE = {
    scenarios: {}
}

const devToolsOptions = { name: 'ScenarioStore' }

const useScenarioStore = create(
    devtools(
        (set, get) => ({
            ...INITIAL_STATE,
            mergeScenarioList: (scenarioList) =>
                set(
                    produce((state) => {
                        const newScenarios = scenarioList.reduce(
                            (prevScenarios, scenarioItem) => {
                                return {
                                    ...prevScenarios,
                                    [scenarioItem.scenarioId]: {
                                        scenarioId: scenarioItem.scenarioId,
                                        ...scenarioItem
                                    }
                                }
                            },
                            {}
                        )
                        console.log('###DEBUG### newScenarios', newScenarios)
                        return {
                            scenarios: newScenarios
                        }
                    }),
                    false,
                    'mergeScenarioList'
                ),
            // deleteScenario: (id) =>
            //     set(
            //         (state) => ({
            //             ...state.scenario,
            //             [id]: null
            //         }),
            //         false,
            //         'deleteScenario'
            //     ),
            getScenarioById: (id) => get().scenarios[id],
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

export default useScenarioStore
