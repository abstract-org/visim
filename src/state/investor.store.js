import create from 'zustand';
import {devtools} from 'zustand/middleware';

const useInvestorStore = create(devtools((set, get) => ({
    active: null,
    investors: [],
    addInvestors: (investors) => set(() => (
        {investors: investors}
    )),
    setActive: (investorHash) => set((state) => (
        {active: investorHash}
    )),
    getByHash: (investorHash) => get().investors.find((investor) => investor.hash === investorHash)
})))

export default (useInvestorStore);