import 'primeflex/primeflex.css'
import 'primeicons/primeicons.css'
import { Card } from 'primereact/card'
import 'primereact/resources/primereact.min.css'
import 'primereact/resources/themes/lara-light-indigo/theme.css'
import { useEffect, useRef, useState } from 'react'

import { CapTableSidebar } from './components/CapTable'
import { KnowledgeGraphV2 } from './components/KnowledgeGraphV2'
import { MoneyFlowSidebar } from './components/MoneyFlowSidebar'
import { MoneyLeakBar } from './components/MoneyLeakBar'
import { PoolChart } from './components/PoolChart'
import { GeneratorRunner } from './logic/Generators/Generator.components'
import useGeneratorStore from './logic/Generators/generator.store'
import {
    InvestorModule,
    InvestorPoolBalance,
    InvestorSelector
} from './logic/Investor/Investor.components'
import { LogsModule } from './logic/Logs/Logs'
import {
    KnowledgeGraphStats,
    PoolChartStats,
    PoolPositions,
    PoolSelector,
    SwapMode,
    SwapModule
} from './logic/Pool/Pool.components'
import { QuestCitation, QuestCreation } from './logic/Quest/Quest.components'
import { StatesSidebar } from './logic/States/StatesSidebar.component'
import { SupabaseAuthProvider } from './logic/Supabase/Supabase.components'
import { TopMenu } from './logic/TopMenu.component'
import useExpertModeStore from './stores/expertMode.store'

export default function Home() {
    const [statesVisible, setStatesVisible] = useState(false)
    const [capTableVisible, setCapTableVisible] = useState(false)
    const [moneyflowVisible, setMoneyflowVisible] = useState(false)
    const needScrollUp = useGeneratorStore((state) => state.needScrollUp)
    const setNeedScrollUp = useGeneratorStore((state) => state.setNeedScrollUp)
    const setExpertMode = useExpertModeStore((state) => state.setExpertMode)
    const isExpert = useExpertModeStore((state) => state.isExpert)
    const graphCard = useRef(null)

    useEffect(() => {
        if (needScrollUp) {
            graphCard.current.scrollIntoView()
            setNeedScrollUp(false)
        }
    }, [needScrollUp, setNeedScrollUp])

    return (
        <SupabaseAuthProvider>
            <div className="grid">
                <div className="col-12">
                    <TopMenu
                        statesVisible={statesVisible}
                        setStatesVisible={setStatesVisible}
                        capTableVisible={capTableVisible}
                        setCapTableVisible={setCapTableVisible}
                        moneyflowVisible={moneyflowVisible}
                        setMoneyflowVisible={setMoneyflowVisible}
                        isExpert={isExpert}
                        setExpertMode={setExpertMode}
                    />
                </div>
                {isExpert && (
                    <div className="col-12">
                        <MoneyLeakBar />
                    </div>
                )}
                <StatesSidebar
                    isVisible={statesVisible}
                    setVisible={setStatesVisible}
                />
                <CapTableSidebar
                    isVisible={capTableVisible}
                    setVisible={setCapTableVisible}
                />
                <MoneyFlowSidebar
                    moneyflowVisible={moneyflowVisible}
                    setMoneyflowVisible={setMoneyflowVisible}
                />
                <div className="col-8">
                    <Card className="h-full">
                        <PoolSelector />
                        <PoolChartStats />
                        <PoolChart height={215} />
                        <PoolPositions />
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
                                <div className="col-12">
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
                            <div className="col-12" ref={graphCard}>
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
        </SupabaseAuthProvider>
    )
}
