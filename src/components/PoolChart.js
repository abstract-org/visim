import { Chart } from 'primereact/chart'
import React from 'react'

import usePoolStore from '../stores/pool.store'
import { swapLog } from '../utils/uiUtils'

const alternatePointRotation = (ctx) => {
    return ctx.raw && ctx.raw.action === 'BOUGHT' ? 0 : 180
}

const alternateBgColor = (ctx) => {
    if (!ctx.raw) return

    const isDirectSwap = !ctx.raw.paths || ctx.raw.paths.split('-').length === 2

    const bought = isDirectSwap ? 'lightgreen' : 'green'
    const sold = isDirectSwap ? 'red' : 'darkred'

    return ctx.raw.action === 'BOUGHT' ? bought : sold
}

export const options = {
    responsive: true,
    maintainAspectRatio: false,
    parsing: {
        xAxisKey: 'idx',
        yAxisKey: 'price'
    },
    scales: {
        x: {
            ticks: {
                color: '#000000',
                autoSkip: true,
                maxTicksLimit: 20,
                stepSize: 10
            },
            grid: {
                color: '#ebedef'
            }
        },
        y: {
            ticks: {
                color: '#495057',
                beginAtZero: false,
                stepSize: 1
            },
            grid: {
                color: '#ebedef'
            }
        }
    },
    plugins: {
        legend: false,
        tooltip: {
            displayColors: false,
            callbacks: {
                title: function (data) {
                    return `Block ${data[0].label}`
                },
                afterBody: function (data) {
                    const raw = data[0].raw
                    return swapLog(raw)
                },
                label: function (data) {
                    const isDirectSwap =
                        !data.raw.paths ||
                        data.raw.paths.split('-').length === 2
                    const returnedArray = [
                        isDirectSwap ? 'DIRECT' : 'SMART',
                        'Price: ' + parseFloat(data.raw.price).toLocaleString()
                    ]
                    return returnedArray
                },
                tooltip: {
                    usePointStyle: true
                }
            }
        }
    },
    elements: {
        point: {
            hoverRadius: 15,
            radius: 10,
            pointStyle: 'triangle',
            pointRotation: alternatePointRotation,
            backgroundColor: alternateBgColor,
            pointBorderWidth: 0
        }
    }
}

export function PoolChart() {
    const swaps = usePoolStore((state) => state.swaps)
    const activePool = usePoolStore((state) => state.active)

    const data = {
        labels: [],
        datasets: [
            {
                fill: true,
                label: '',
                data: [],
                borderColor: 'black',
                spanGaps: true
            }
        ]
    }

    const localSwaps = JSON.parse(JSON.stringify(swaps))

    const poolSwaps = localSwaps
        .map((swap) => (swap.pool === activePool ? swap : null))
        .filter((x) => x)

    poolSwaps.forEach((swap, idx) => {
        if (swap && activePool === swap.pool) {
            swap['idx'] = idx
            data.datasets[0].data.push(swap)
            data.labels.push(idx)
        }
    })

    return (
        <div style={{ height: '215px' }}>
            <Chart type="line" data={data} options={options} />
        </div>
    )
}
