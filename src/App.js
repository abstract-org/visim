import 'primeflex/primeflex.css'
import 'primeicons/primeicons.css'
import { Card } from 'primereact/card'
import 'primereact/resources/primereact.min.css'
import 'primereact/resources/themes/lara-light-indigo/theme.css'
import { useState } from 'react'

import { KnowledgeGraphV2 } from './components/KnowledgeGraphV2'
import { PoolChart } from './components/PoolChart'
import { GeneratorRunner } from './logic/Generators/Generator.components'
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
import { StatesSidebar } from './logic/States/StatesSidebar.component'
import { TopMenu } from './logic/TopMenu.component'

export default function Home() {
    const [sidebarVisible, setSidebarVisible] = useState(false)
    const setVisibleSidebar = (isVisible) => setSidebarVisible(() => isVisible)

    return (
        <div>
            <div className="grid">
                <div className="col-12">
                    <TopMenu
                        sidebarVisible={sidebarVisible}
                        setVisibleSidebar={setVisibleSidebar}
                    />
                </div>
                <StatesSidebar
                    visible={sidebarVisible}
                    setVisibleSidebar={setVisibleSidebar}
                />
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
                            <div className="col-12 h-full">
                                <KnowledgeGraphV2 />
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
            <GeneratorRunner />
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
