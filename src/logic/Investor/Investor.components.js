import React from 'react';
import {ProgressBar} from 'primereact/progressbar';
import {Dropdown} from 'primereact/dropdown';
import agoraPbar from '../../styles/progressbar.module.css';

import generateInvestors from './Investor.generator';
import useInvestorStore from '../../state/investor.store';


const addInvestorsSelector = state => state.addInvestors
const setActiveSelector = state => state.setActive
const getByHashSelector = state => state.getByHash

export function InvestorModule({children}) {
  const investors = generateInvestors(10);
  const addInvestors = useInvestorStore(addInvestorsSelector)

  addInvestors(investors)

  return(
    <div>{children}</div>
  )
}

export function InvestorSelector() {
  const investors = useInvestorStore((state) => state.investors)
  const setActive = useInvestorStore(setActiveSelector)
  let activeInvestor = useInvestorStore((state) => state.active)

  const investorsValues = investors.map((investor) => ({label: `${investor.type} (${investor.id})`, value: investor.hash}))
  return (
    <Dropdown value={activeInvestor} options={investorsValues} onChange={(e) => setActive(e.value)} placeholder='Choose Investor' />
  )
}

export function InvestorTokenBalance({displayValueTemplate}) {
  const activeInvestorHash = useInvestorStore((state) => state.active)
  const getByHash = useInvestorStore(getByHashSelector)
  const currentInvestor = getByHash(activeInvestorHash)

  let progressBar
  
  if (currentInvestor) {
    progressBar = <ProgressBar value={currentInvestor.balances.USDC} displayValueTemplate={displayValueTemplate}></ProgressBar>
  } else {
    progressBar = <ProgressBar value={0} displayValueTemplate={displayValueTemplate}></ProgressBar>
  }

  return(
    <div className={agoraPbar.agoraPbar}>
      <p>{(currentInvestor ? Object.keys(currentInvestor.balances)[0] : '') + ' Balance'}</p>
      {progressBar}
    </div>
  )
}