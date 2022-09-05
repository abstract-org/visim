import create from 'zustand'
import produce from 'immer'
import { devtools } from 'zustand/middleware'

const useGeneratorStore = create(
    devtools((set, get) => ({
        investorGens: [],
        questGens: [],
        addInvestorGen: (genLen) =>
            set(
                produce((state) => ({
                    investorGens: Array.from({ length: genLen }).fill({})
                }))
            ),
        removeInvestorGen: (genId) =>
            set((state) => {
                const gens = [...get().investorGens]
                const index = gens.indexOf(genId)
                gens.splice(index, 1)
                state.investorGens = gens
            }),
        addQuestGen: (genId) =>
            set(
                produce((state) => ({
                    questGens: [...state.questGens, genId]
                }))
            )
    }))
)

export default useGeneratorStore
