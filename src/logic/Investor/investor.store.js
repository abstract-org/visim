import create from 'zustand';
import produce from 'immer';
import {devtools} from 'zustand/middleware';

const useInvestorStore = create(devtools((set, get) => ({
    active: null,
    investors: [],
    addInvestors: (investorsList) => set(produce(state => {
        investorsList.forEach(hash => {
            if (!get().investors.find(i => i === hash)) {
                state.investors.push(hash);
            }
        })
    })),
    setActive: (investorHash) => set({active: get().investors.find(hash => hash === investorHash)}),
    getByHash: (investorHash) => get().investors.find(hash => hash === investorHash)
})))

export default (useInvestorStore);