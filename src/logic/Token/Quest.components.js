import React, {useState} from 'react';

import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { ScrollPanel } from 'primereact/scrollpanel';
import { Button } from 'primereact/button';


import agoraCheck from '../../styles/checkbox.module.css';

import useQuestStore from '../../state/quest.store';

import { InvestorSelector } from '../Investor/Investor.components';

export const QuestManager = () => {
    const [questName, setQuestName] = useState('')
    const [citedQuests, setCitedQuests] = useState([])
    const addQuest = useQuestStore((state) => state.addQuest)

    const handleQuestName = e => {
      setQuestName(e.target.value)
    }

    const handleClick = () => {
      if (questName.length <= 0) {
        return
      }

      addQuest(questName)
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
          <Button className="p-button-success" style={{margin: '0.375rem 0'}} onClick={handleClick}>Create new Quest</Button>  
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
        selectedQuests.splice(selectedQuests.indexOf(e.value), 1);
      }

      setSelectedQuests(selectedQuests)
    }

    if (quests.length <= 0) {
      return <div style={{margin: '0.5rem'}}>No Quests were created so far...</div>
    }

    return (
      <div>
        {quests.map(((quest, idx) => {
          return (
            <div className="field-checkbox" key={idx}>
              <Checkbox inputId={`quest${idx}`} name={`quest${idx}`} value={quest} onChange={handleQuestSelect} checked={selectedQuestsStored.includes(quest)} />
              <label htmlFor={`quest${idx}`}>{quest}</label>
            </div>
          )
        }))}
      </div>
    )
}