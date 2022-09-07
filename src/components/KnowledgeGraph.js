import React from 'react'
import { Canvas, Node, MarkerArrow, Edge, Port } from 'reaflow'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

import usePoolStore from '../logic/Pool/pool.store'
import useQuestStore from '../logic/Quest/quest.store'
import globalState from '../logic/GlobalState'

// Citing(or USDC) from left - cited from right
export function KnowledgeGraph() {
    const pools = usePoolStore((state) => state.pools)
    const quests = useQuestStore((state) => state.quests)
    const setActivePool = usePoolStore((state) => state.setActive)
    const setActiveQuest = useQuestStore((state) => state.setActive)
    const swaps = usePoolStore((state) => state.swaps)
    const activePool = usePoolStore((state) => state.active)
    const activeQuest = useQuestStore((state) => state.active)
    // const pool = activePool && globalState.pools.get(activePool)

    let edges = []
    let nodes = []
    let producedEdges = []

    const defSize = { width: 80, height: 50 }

    quests.forEach((quest, idx) => {
        nodes.push({
            id: idx,
            text: quest,
            data: {
                active:
                    activeQuest &&
                    (globalState.pools.get(activePool).tokenLeft.name ===
                        quest ||
                        globalState.pools.get(activePool).tokenRight.name ===
                            quest)
                        ? true
                        : false
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
                const citingId = quests.findIndex((qs) => qs === citing)
                const citedId = quests.findIndex((qs) => qs === cited)

                if (!producedEdges.includes(`${citedId}-${citingId}`)) {
                    edges.push({
                        id: `${citedId}-${citingId}`,
                        from: citingId,
                        to: citedId,
                        pool: `${cited}-${citing}`
                    })
                }

                producedEdges.push(`${citedId}-${citingId}`)
            })
        }
    })

    return (
        <div className="m-auto">
            <TransformWrapper
                wheel={{ step: 0.2 }}
                options={{
                    maxScale: 4,
                    limitToBounds: false
                }}
                pinch={{
                    disabled: true
                }}
                wrapperStyle={{ margin: '0 auto' }}
            >
                <TransformComponent>
                    <Canvas
                        maxHeight={360}
                        maxWidth={800}
                        nodes={nodes}
                        edges={edges}
                        pannable={true}
                        zoomable={false}
                        fit={true}
                        node={(node) => (
                            <Node
                                onClick={() => {
                                    const quest = globalState.quests.get(
                                        node.properties.text
                                    )
                                    if (quest.pools.length > 0) {
                                        quest.pools.forEach((pool) => {
                                            if (pool.getType() === 'QUEST') {
                                                setActivePool(pool.name)
                                                setActiveQuest(
                                                    pool.tokenRight.name
                                                )
                                            }
                                        })
                                    }
                                }}
                                className={
                                    node.properties.data.active
                                        ? 'fill-active'
                                        : 'fill-inactive'
                                }
                                port={
                                    <Port
                                        style={{
                                            fill: 'blue',
                                            stroke: 'white'
                                        }}
                                        rx={10}
                                        ry={10}
                                    />
                                }
                                style={{
                                    stroke: '#1a192b',
                                    strokeWidth: 1
                                }}
                            />
                        )}
                        arrow={<MarkerArrow style={{ fill: '#b1b1b7' }} />}
                        edge={(edge) => (
                            <Edge
                                className="edge"
                                onClick={() => {
                                    const pool = globalState.pools.get(
                                        edge.properties.pool
                                    )
                                    setActivePool(pool.name)
                                    setActiveQuest(pool.tokenLeft.name)
                                }}
                            />
                        )}
                    />
                </TransformComponent>
            </TransformWrapper>
        </div>
    )
}
