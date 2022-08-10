import React from 'react';

import { Card } from 'primereact/card';
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
import agoraDt from './styles/datatable.module.css';

import { InvestorModule, InvestorPoolBalance, InvestorSelector } from './logic/Investor/Investor.components';
import { QuestSelector, QuestManager } from './logic/Token/Quest.components';
import { PoolSelector, PoolChartStats, SwapModule } from './logic/Pool/Pool.components';

export default function Home() {
  const logs = [
    {"id": 1, "block": "Test", "event": "UYDHFIUHSD"},
    {"id": 1, "block": "Test", "event": "UYDHFIUHSD"},
    {"id": 1, "block": "Test", "event": "UYDHFIUHSD"},
    {"id": 1, "block": "Test", "event": "UYDHFIUHSD"},
    {"id": 1, "block": "Test", "event": "UYDHFIUHSD"}
  ]

  return (
    <div>
      <div className="grid">
        <div className="col-8">
          <Card className={agoraCard.agoraCard}>
            <PoolSelector />
            <PoolChartStats />
            <PoolChart height={215} />
          </Card>
        </div>
        <div className="col-4" style={{minHeight: '400px'}}>
          <Card className={`${agoraCard.agoraCard}`}>
            <div>
              <div className="grid">
                <div className="col-12">
                  <InvestorModule>
                    <InvestorSelector />
                  </InvestorModule>
                </div>
              </div>
              <div className="grid">
                <div className="col-12">
                  <InvestorPoolBalance />
                </div>
              </div>
              <SwapModule />
            </div>
          </Card> 
        </div>
      </div>
      <div className="grid grid-nogutter">
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
    </div> 
  )
}