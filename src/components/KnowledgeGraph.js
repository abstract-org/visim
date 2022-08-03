import React, { useState } from 'react';

import {Canvas} from 'reaflow';

export function KnowledgeGraph() {
    const [zoom, setZoom] = useState(1.0)

    return <Canvas
        zoom={zoom}
        maxWidth={1200}
        maxHeight={360}
        nodes={[
        {
            id: '1',
            text: 'Quest 1'
        },
        {
            id: '2',
            text: 'Quest 2'
        }
        ]}

        edges={[
        {
            id: '1-2',
            from: '1',
            to: '2'
        }
        ]}

        onZoomChange={z => {
            setZoom(z)
        }}
    />
}