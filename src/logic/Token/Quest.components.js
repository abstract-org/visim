import React, {useState} from 'react';

import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { ScrollPanel } from 'primereact/scrollpanel';
import { Button } from 'primereact/button';

import agoraCheck from '../../styles/checkbox.module.css';

import useQuestStore from './quest.store';
import useInvestorStore from '../Investor/investor.store';
import usePoolStore from '../Pool/pool.store';

import { InvestorSelector } from '../Investor/Investor.components';
import globalState from '../GlobalState';

const addPoolSelector = state => state.addPool
const addQuestSelector = state => state.addQuest

export const QuestSelector = () => {
  const quests = useQuestStore((state) => state.quests)
  const activeQuest = useQuestStore((state) => state.active)
  const setActive = useQuestStore((state) => state.setActive)
  const quest = activeQuest && globalState.quests.get(activeQuest)

  return (
    <Dropdown 
      value={quest && quest.name} 
      options={quests.map(questName => globalState.quests.get(questName).name)} 
      onChange={(e => setActive(quests.find(questName => questName === e.value)))}
      placeholder='Choose Quest' />
  );
}

export const QuestManager = () => {
    const [questName, setQuestName] = useState('')
    const addPool = usePoolStore(addPoolSelector)
    const addQuest = useQuestStore(addQuestSelector)
    const activeInvestor = useInvestorStore((state) => state.active)

    const handleQuestName = e => {
      setQuestName(e.target.value)
    }

    const handleCreateQuest = () => {
      if (questName.length <= 0 && activeInvestor === null) {
        console.log('Cannot create quest without selecting investor')
        return
      }

      const investor = activeInvestor && globalState.investors.get(activeInvestor)
      const tokenRight = investor.createQuest(questName)
      const pool = tokenRight.createPool()
      tokenRight.addToPool(pool)
      tokenRight.initializePoolPositions(pool)

      globalState.quests.set(tokenRight.name, tokenRight)
      globalState.pools.set(pool.name, pool)
      addQuest(tokenRight.name)
      addPool(pool.name)
    }

    return (
      <div>
        <h3>Create Quest</h3>
        <InvestorSelector />
        <div>
          <div className="field">
              <label htmlFor="questName" className="block">Name</label>
              <InputText id="questName" aria-describedby="questName-help" className="block" value={questName} onChange={handleQuestName} autoComplete="off" />
          </div>
        </div>
        <h3>Citing Quests</h3>
        <ScrollPanel className={agoraCheck.agoraCheck} style={{width: '100%', height: '8rem'}}>
          <CitingQuestList />
        </ScrollPanel>
        <div className="flex justify-content-center">
          <Button className="p-button-success" style={{margin: '0.375rem 0'}} onClick={handleCreateQuest}>Create new Quest</Button>  
        </div>
      </div>
    )
  }

export const CitingQuestList = () => {
    const quests = useQuestStore((state) => state.quests)
    const selectedQuestsStored = useQuestStore((state) => state.selectedQuests)
    const setSelectedQuests = useQuestStore((state) => state.setSelectedQuests)

    const handleQuestSelect = (e) => {
      let selectedQuests = [...selectedQuestsStored]

      if (e.checked) {
        selectedQuests.push(e.value)
      } else {
        selectedQuests.splice(selectedQuests.indexOf(e.value), 1)
      }

      setSelectedQuests(selectedQuests)
    }

    if (quests.length <= 0) {
      return <div style={{margin: '0.5rem'}}>No Quests were created so far...</div>
    }

    return (
      <div>
        {quests.map(((quest, idx) => {
          const questObj = globalState.quests.get(quest)

          return (
            <div className="field-checkbox" key={idx}>
              <Checkbox inputId={`quest-${questObj.name}`} name={`quest-${questObj.name}`} value={questObj.name} onChange={handleQuestSelect} checked={selectedQuestsStored.includes(questObj.name)} />
              <label htmlFor={`quest-${questObj.name}`}>{questObj.name}</label>
            </div>
          )
        }))}
      </div>
    )
}