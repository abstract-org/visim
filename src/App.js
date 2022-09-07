import 'primeflex/primeflex.css'
import 'primeicons/primeicons.css'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { Divider } from 'primereact/divider'
import { InputNumber } from 'primereact/inputnumber'
import 'primereact/resources/primereact.min.css'
import 'primereact/resources/themes/lara-light-indigo/theme.css'
import React from 'react'

import { KnowledgeGraph } from './components/KnowledgeGraph'
import { PoolChart } from './components/PoolChart'
import {
    InvestorRandomGenerator,
    QuestRandomGenerator
} from './logic/Generators/Generator.components'
import {
    InvestorModule,
    InvestorPoolBalance,
    InvestorSelector
} from './logic/Investor/Investor.components'
import { LogsModule } from './logic/Logs/Logs'
import {
    KnowledgeGraphStats,
    PoolChartStats,
    PoolSelector,
    SwapMode,
    SwapModule
} from './logic/Pool/Pool.components'
import { QuestCitation, QuestCreation } from './logic/Quest/Quest.components'

export default function Home() {
    return (
        <div>
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
            </div>
            <div className="grid">
                <div className="col-12">
                    <Card className="h-full">
                        <div className="grid">
                            <div className="col-12">
                                <div className="flex justify-content-between flex-wrap">
                                    <div className="flex flex-grow-1">
                                        <h2 className="m-0">
                                            Random Generator
                                        </h2>
                                    </div>
                                    <div className="flex flex-grow-0 mr-3">
                                        <Button label="Generate" />
                                    </div>
                                    <div className="flex flex-grow-0 w-1">
                                        <div className="p-inputgroup">
                                            <span className="p-inputgroup-addon">
                                                Days
                                            </span>
                                            <InputNumber
                                                placeholder="100"
                                                value={100}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid">
                            <div className="col-12">
                                <InvestorRandomGenerator />
                            </div>
                        </div>
                        <div className="grid">
                            <Divider />
                        </div>
                        <div className="grid">
                            <div className="col-12">
                                <QuestRandomGenerator />
                            </div>
                        </div>
                    </Card>
                </div>
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
