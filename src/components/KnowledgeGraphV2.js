import {
    ControlsContainer,
    FullScreenControl,
    SearchControl,
    SigmaContainer,
    ZoomControl
} from '@react-sigma/core'
import '@react-sigma/core/lib/react-sigma.min.css'
import { LayoutForceAtlas2Control } from '@react-sigma/layout-forceatlas2'
import { MultiDirectedGraph } from 'graphology'

import globalState from '../logic/GlobalState'
import usePoolStore from '../logic/Pool/pool.store'
import useQuestStore from '../logic/Quest/quest.store'

export const KnowledgeGraphV2 = (props) => {
    const pools = usePoolStore((state) => state.pools)
    const quests = useQuestStore((state) => state.quests)
    const humanQuests = useQuestStore((state) => state.humanQuests)
    const setActivePool = usePoolStore((state) => state.setActive)
    const setActiveQuest = useQuestStore((state) => state.setActive)
    const swaps = usePoolStore((state) => state.swaps)
    const activePool = usePoolStore((state) => state.active)
    const activeQuest = useQuestStore((state) => state.active)

    const RED = '#FA4F40'
    const BLUE = '#727EE0'
    const GREEN = '#5DB346'

    const graph = new MultiDirectedGraph({ allowSelfLoop: true, multi: true })
    let edges = []
    let nodes = []
    let producedEdges = []

    quests.forEach((quest) => {
        if (!graph.hasNode(quest)) {
            graph.addNode(quest, {
                size: 15,
                label: quest,
                color: humanQuests.includes(quest) ? BLUE : RED,
                x: Math.random(),
                y: Math.random()
            })
        }
    })

    const citingPools = pools.filter(
        (pool) =>
            globalState.pools.get(pool).name === pool &&
            globalState.pools.get(pool).getType() !== 'QUEST'
    )

    if (citingPools.length > 0) {
        citingPools.forEach((poolName) => {
            const [cited, citing] = poolName.split('-')
            if (!graph.hasNode(poolName)) {
                graph.addNode(poolName, {
                    size: 15,
                    label: poolName,
                    color: GREEN,
                    x: Math.random(),
                    y: Math.random()
                })
            }

            graph.addEdge(citing, poolName, { label: poolName, size: 5 })
            graph.addEdge(poolName, cited, { label: poolName, size: 5 })
        })
    }

    return (
        <SigmaContainer
            initialSettings={{ allowInvalidContainer: true }}
            graph={graph}
            style={{ height: '500px' }}
        >
            <ControlsContainer position={'bottom-right'}>
                <ZoomControl />
                <FullScreenControl />
                <LayoutForceAtlas2Control />
            </ControlsContainer>
            <ControlsContainer position={'top-right'}>
                <SearchControl />
            </ControlsContainer>
        </SigmaContainer>
    )
}
