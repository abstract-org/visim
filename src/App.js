import React, { useState } from 'react';

import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

import { PoolChart } from './components/PoolChart'
import { KnowledgeGraph } from './components/KnowledgeGraph'
import { PositionsChart } from './components/PositionsChart'

import 'primereact/resources/themes/lara-light-indigo/theme.css'
import 'primereact/resources/primereact.min.css';
import 'primeflex/primeflex.css'
import 'primeicons/primeicons.css';

import agoraCard from './styles/card.module.css';
import buttonFactory from './styles/button.module.css';
import agoraInput from './styles/input.module.css';
import agoraDt from './styles/datatable.module.css';

import generatePool from './logic/Pool/Pool.generator';
import generateToken from './logic/Token/Token.generator';

import { InvestorModule, InvestorTokenBalance, InvestorSelector } from './logic/Investor/Investor.components';
import { QuestManager, CitingQuestList } from './logic/Token/Quest.components';


const token0 = generateToken('Research Paper 1');
const token1 = generateToken('USDC');
const pool = generatePool(token0, token1);

const papers = [
  { label: 'Research Paper 1', value: 'PR1' },
  { label: 'Research Paper 2', value: 'PR2' },
  { label: 'Research Paper 3', value: 'PR3' },
  { label: 'Research Paper 4', value: 'PR4' },
]

const numericValuePair = (value) => {
  return (
    <React.Fragment>
      {value}
    </React.Fragment>
  )
}

export default function Home() {
  const [paper, setPaper] = useState(null);
  const [rightPairValue, setRightPairValue] = useState(50);
  const [cities, setCities] = useState([]);

  const onPaperChange = (e) => {
      let selectedPapers = [...papers];

      if (e.checked)
      selectedPapers.push(e.value);
      else
      selectedPapers.splice(selectedPapers.indexOf(e.value), 1);

      setPaper(selectedPapers);
  }

  const logs = [
    {"id": 1, "block": "Test", "event": "UYDHFIUHSD"},
    {"id": 1, "block": "Test", "event": "UYDHFIUHSD"},
    {"id": 1, "block": "Test", "event": "UYDHFIUHSD"},
    {"id": 1, "block": "Test", "event": "UYDHFIUHSD"},
    {"id": 1, "block": "Test", "event": "UYDHFIUHSD"}
  ]

  return (
    <div className="grid grid-nogutter">
        <div className="col-8">
            <Card className={agoraCard.agoraCard}>
              <Dropdown className="flex-none" value="RP1" options={[{label:'Research Paper/USDC', value:'RP1'}]} />
              
              <div className="flex">
                <div className="flex-grow-1 flex align-items-center">
                  <div>Current Price:</div>
                  <div>2,180.768</div>
                </div>
                <div className="flex-grow-1 flex align-items-center justify-content-center">
                  <p className="block">Pool's Locked Value (USDC):</p>
                  <h4 className="block">8,620,000.398</h4>
                </div>
                <div className="flex-grow-1 flex align-items-center justify-content-center">
                  <div>Total Tokens Locked:</div>
                  <Card style={{backgroundColor: '#f2f2f2'}}>
                    <p>Research Paper: 1,605</p>
                    <p>USDC: 5,252,453</p>
                  </Card>
                </div>
              </div>

              <PoolChart height={215} />
            </Card>
          </div>
          <div className="col-4">
            <Card className={agoraCard.agoraCard} style={{height:'215px'}}>
              <InvestorModule>
                <InvestorSelector />
              </InvestorModule>
              <InvestorTokenBalance tokenKey="token0" displayValueTemplate={numericValuePair} />
              <InvestorTokenBalance tokenKey="token1" displayValueTemplate={numericValuePair} />
              <div>
              <Dropdown value={paper} options={papers} onChange={(e) => setPaper(e.value)} placeholder='Choose Paper' />
              </div>
              <div className={agoraInput.agoraSell} prefix="USDC">
                <InputNumber value={0} />
              </div>
              <div className={buttonFactory.buttonFactory}>
                <Button label="Buy (in USDC)" />
                <Button className="p-button-danger" label="Sell Tokens" />
              </div>
            </Card> 
          </div>
          <div className="col-8">
            {/*<Card className={agoraCard.agoraCard}>
              <h2>Knowledge Graph</h2>
              <div className="flex">
                <div className="flex-grow-1 flex align-items-center">
                  <div>Total Quests:</div>
                  <div>10</div>
                </div>
                <div className="flex-grow-1 flex align-items-center justify-content-center">
                  <p className="block">Total Market Cap:</p>
                  <h4 className="block">8,620,000.398</h4>
                </div>
                <div className="flex-grow-1 flex align-items-center justify-content-center">
                  <div>Total Value Locked:</div>
                  <p>Research Paper: 1,605</p>
                  <p>USDC: 5,252,453</p>
                </div>  
              </div>

             <KnowledgeGraph />
            </Card>*/}
          </div>
          <div className="col-4">
            <Card className={agoraCard.agoraCard}>
              <QuestManager />
            </Card>
          </div>
          {/*<div className="col-8">
            <Card className={agoraCard.agoraCard}>
              <h2>Positions</h2>
              <Dropdown value={paper} options={papers} onChange={(e) => setPaper(e.value)} placeholder='Choose Paper' />
              <PositionsChart height={215} />
            </Card>
          </div>
          <div className="col-4">
            <Card className={agoraCard.agoraCard}>
              <DataTable className={agoraDt.agoraDt} value={logs} header="Logs" size="small" responsiveLayout="scroll">
                  <Column field="block" header="Block"></Column>
                  <Column field="event" header="Event"></Column>
              </DataTable>
            </Card>
          </div>
          <div className="col-8">
            <Card className={agoraCard.agoraCard}>
              Random Generator
            </Card>
          </div>
          <div className="col-4">
            <Card className={agoraCard.agoraCard}>
              Token Manager
            </Card>
          </div>*/}
    </div>    
  )
}