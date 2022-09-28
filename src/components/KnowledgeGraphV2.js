import {
    ControlsContainer,
    FullScreenControl,
    SearchControl,
    SigmaContainer,
    ZoomControl,
    useLoadGraph,
    useRegisterEvents,
    useSetSettings,
    useSigma
} from '@react-sigma/core'
import '@react-sigma/core/lib/react-sigma.min.css'
import { LayoutForceAtlas2Control } from '@react-sigma/layout-forceatlas2'
import { MultiDirectedGraph } from 'graphology'
import * as hilbertCurve from 'hilbert-curve'
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

    const setSettings = useSetSettings()
    const [ hoveredNode, setHoveredNode ] = useState(null)
    const [ hoveredEdge, setHoveredEdge ] = useState(null)
    const sigma = useSigma()

    useEffect(() => {
        const COLORS = {
            edgeDefault: '#EEEEEE',
            edgeConnected: '#AAAAEE',
            edgeHighlighted: '#FF4444'
        }
        setSettings({
            enableEdgeHoverEvents: 'debounce',
            zIndex: true,
            nodeReducer: (node, data) => {
                const graph = sigma.getGraph()
                const newData = {
                    ...data,
                    highlighted: data.highlighted || false
                }

                if (hoveredNode) {
                    newData.highlighted = (node === hoveredNode) || graph.neighbors(hoveredNode).includes(node)
                }

                if (hoveredEdge) {
                    const hoveredEdgeNodes = [graph.source(hoveredEdge), graph.target(hoveredEdge)]
                    newData.highlighted = hoveredEdgeNodes.includes(node)
                }

                return newData
            },
            edgeReducer: (edge, data) => {
                const graph = sigma.getGraph()
                const newEdgeData = {
                    ...data,
                    color: COLORS.edgeDefault,
                    zIndex: 1,
                }
                if (hoveredNode && graph.extremities(edge).includes(hoveredNode)) {
                    newEdgeData.color = COLORS.edgeConnected
                    newEdgeData.zIndex = 99
                }

                if (hoveredEdge && edge === hoveredEdge) {
                    newEdgeData.color = COLORS.edgeHighlighted
                    newEdgeData.zIndex = 99
                }

                return newEdgeData
            },
        })
    }, [ hoveredNode, hoveredEdge ])

    useEffect(() => {
        const RED = '#FA4F40'
        const BLUE = '#727EE0'
        const GREEN = '#5DB346'

        const graph = new MultiDirectedGraph({
            allowSelfLoop: true,
            multi: true
        })

        // console.log(clickedNode)

        // const data = []
        // quests.forEach((quest, id) => {
        //     data.push(id)
        // })
        // hilbertCurve.construct(data, 2)

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
                graph.addEdge(citing, cited, { label: poolName, size: 5 })
            })
        }

        registerEvents({
            clickNode: (event) => {
                const questPool = globalState.pools.values()
                  .find(pool => pool.getType() === 'QUEST' && pool.tokenRight.name === event.node)

                if (questPool) {
                  setActivePool(questPool.name)
                }
            },
            clickEdge: (event) => {
                const edgeSource = graph.source(event.edge)
                const edgeTarget = graph.target(event.edge)
                const poolName = `${edgeTarget}-${edgeSource}`
                if (globalState.pools.get(poolName).getType() === 'VALUE_LINK') {
                    setActivePool(poolName)
                }
            },
            enterNode: event => setHoveredNode(event.node),
            leaveNode: () => setHoveredNode(null),
            enterEdge: event => setHoveredEdge(event.edge),
            leaveEdge: () => setHoveredEdge(null)
        })

        loadGraph(graph)

    }, [setHoveredEdge, registerEvents, loadGraph, humanQuests, pools, quests, clickedNode])

    return null
}

export const KnowledgeGraphV2 = () => {
    return (
        <SigmaContainer
            initialSettings={{
                allowInvalidContainer: true,
                enableEdgeClickEvents: true,
            }}
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
