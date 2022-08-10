import React from 'react';
import {ProgressBar} from 'primereact/progressbar';
import {Dropdown} from 'primereact/dropdown';

import {numericValue} from '../Utils';
import {generateDefaultInvestors} from './Investor.generator';
import useInvestorStore from './investor.store';
import usePoolStore from '../Pool/pool.store';
import globalState from '../GlobalState';

const addInvestorsSelector = state => state.addInvestors
const setActiveSelector = state => state.setActive

export function InvestorModule({children}) {
  const addInvestors = useInvestorStore(addInvestorsSelector)
  const investors = generateDefaultInvestors();

  investors.forEach(investor => {
    globalState.investors.set(investor.hash, investor)
  })
  addInvestors(investors.map(investor => investor.hash))

  return(
    <div>{children}</div>
  )
}

export function InvestorSelector() {
  const investors = useInvestorStore(state => state.investors)
  const setActive = useInvestorStore(setActiveSelector)
  let activeInvestor = useInvestorStore((state) => state.active)

  const investorsValues = investors.map((investorHash) => 
    ({
      label: `${globalState.investors.get(investorHash).type} (${globalState.investors.get(investorHash).id})`, 
      value: globalState.investors.get(investorHash).hash
    }))
  
    return (
    <Dropdown value={activeInvestor} options={investorsValues} onChange={(e) => setActive(e.value)} placeholder='Choose Investor' />
  )
}

export function InvestorPoolBalance() {
  const activePool = usePoolStore((state) => state.active)
  const activeInvestor = useInvestorStore((state) => state.active)
  const swaps = usePoolStore(state => state.swaps)

  let balanceContent = <p>Choose Pool to see balances</p>

  if (activePool && activeInvestor) {
    const pool = globalState.pools.get(activePool)
    const investor = globalState.investors.get(activeInvestor)

    balanceContent = <div className="grid">
      <div className="col-6">
        <p><b>{(investor && pool.tokenLeft.name)}</b>&nbsp;Balance</p>
        <ProgressBar value={investor && investor.balances[pool.tokenLeft.name]} displayValueTemplate={numericValue}></ProgressBar>
      </div>
      <div className="col-6">
        <p><b>{(pool && pool.tokenRight.name)}</b>&nbsp;Balance</p>
        <ProgressBar value={investor && investor.balances[pool.tokenRight.name] | 0} displayValueTemplate={numericValue}></ProgressBar>
      </div>
    </div>
  }

  return(balanceContent)
}