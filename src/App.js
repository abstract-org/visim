import React from 'react'

import { Card } from 'primereact/card'
import { PoolChart } from './components/PoolChart'
import { KnowledgeGraph } from './components/KnowledgeGraph'
import { LogsModule } from './logic/Logs/Logs'

import 'primereact/resources/themes/lara-light-indigo/theme.css'
import 'primereact/resources/primereact.min.css'
import 'primeflex/primeflex.css'
import 'primeicons/primeicons.css'

import {
    InvestorModule,
    InvestorPoolBalance,
    InvestorSelector
} from './logic/Investor/Investor.components'
import { QuestCitation, QuestCreation } from './logic/Quest/Quest.components'
import {
    SwapMode,
    PoolSelector,
    PoolChartStats,
    SwapModule,
    KnowledgeGraphStats
} from './logic/Pool/Pool.components'
import { ValueLinksDebug } from './logic/Generators/ValueLinksDebug'

export default function Home() {
    return (
        <div>
            <ValueLinksDebug />
            <div className="grid">
                <div className="col-8">
                    <Card className="h-full">
                        <PoolSelector />
                        <PoolChartStats />
                        <PoolChart height={215} />
                    </Card>
                </div>
                <div className="col-4">
                    <Card className="h-full">
                        <div>
                            <div className="grid">
                                <div className="col-10">
                                    <InvestorModule>
                                        <InvestorSelector />
                                    </InvestorModule>
                                </div>
                                <div className="col-2 flex">
                                    <SwapMode />
                                </div>
                            </div>
                            <div className="grid">
                                <div className="col-12">
                                    <InvestorPoolBalance />
                                </div>
                            </div>
                            <div className="grid">
                                <div className="col-10 col-offset-1">
                                    <SwapModule />
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
            <div className="grid mt-2">
                <div className="col-8 m-0 pt-0">
                    <Card className="h-full">
                        <div className="grid">
                            <div className="col-12">
                                <h2>Knowledge Graph</h2>
                                <KnowledgeGraphStats />
                            </div>
                        </div>
                        <div className="grid">
                            <div className="col-12">
                                <KnowledgeGraph />
                            </div>
                        </div>
                    </Card>
                </div>
                <div className="col-4 pr-3 pl-3">
                    <div className="grid">
                        <Card className="col-12 w-full h-full">
                            <QuestCreation />
                        </Card>
                    </div>
                    <div className="grid mt-2">
                        <Card className="col-12 w-full h-full">
                            <QuestCitation />
                        </Card>
                    </div>
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
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <LogsModule />
                    </Card>
                </div>
            </div>
        </div>
    )
}
