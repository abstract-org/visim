import {
    ControlsContainer,
    FullScreenControl,
    SearchControl,
    SigmaContainer,
    ZoomControl,
    useLoadGraph,
    useRegisterEvents
} from '@react-sigma/core'
import '@react-sigma/core/lib/react-sigma.min.css'
import { LayoutForceAtlas2Control } from '@react-sigma/layout-forceatlas2'
import { MultiDirectedGraph } from 'graphology'
import { useEffect, useState } from 'react'

import globalState from '../logic/GlobalState'
import usePoolStore from '../logic/Pool/pool.store'
import useQuestStore from '../logic/Quest/quest.store'

const Graph = (props) => {
    const [clickedNode, setClickNode] = useState(null)
    const pools = usePoolStore((state) => state.pools)
    const quests = useQuestStore((state) => state.quests)
    const humanQuests = useQuestStore((state) => state.humanQuests)
    const setActivePool = usePoolStore((state) => state.setActive)
    const setActiveQuest = useQuestStore((state) => state.setActive)
    const swaps = usePoolStore((state) => state.swaps)
    const activePool = usePoolStore((state) => state.active)
    const activeQuest = useQuestStore((state) => state.active)

    const registerEvents = useRegisterEvents()
    const loadGraph = useLoadGraph()

    useEffect(() => {
        const RED = '#FA4F40'
        const BLUE = '#727EE0'
        const GREEN = '#5DB346'

        const graph = new MultiDirectedGraph({
            allowSelfLoop: true,
            multi: true
        })

        console.log(clickedNode)

        quests.forEach((quest, id) => {
            const pool = globalState.pools
                .values()
                .find((p) => p.tokenRight.name === quest)
            if (!graph.hasNode(quest)) {
                graph.addNode(quest, {
                    size: Math.log(pool.getMarketCap()),
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
            citingPools.forEach((poolName, id) => {
                const [cited, citing] = poolName.split('-')
                if (!graph.hasNode(poolName)) {
                    graph.addNode(poolName, {
                        size: 6,
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

        loadGraph(graph)

        // registerEvents({
        //     clickNode: (event) => setClickNode(event.node)
        // })
    }, [registerEvents, loadGraph, humanQuests, pools, quests, clickedNode])

    return null
}

export const KnowledgeGraphV2 = () => {
    return (
        <SigmaContainer
            initialSettings={{ allowInvalidContainer: true }}
            style={{ height: '500px' }}
        >
            <Graph />
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
