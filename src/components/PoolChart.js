import React from 'react'
import { Chart } from 'primereact/chart'
import usePoolStore from '../logic/Pool/pool.store'
import { swapLog } from '../logic/Utils/uiUtils'

const alternatePointRotation = (ctx) => {
    return ctx.raw && ctx.raw.action === 'buy' ? 0 : 180
}

const alternateBgColor = (ctx) => {
    return ctx.raw && ctx.raw.action === 'buy' ? 'green' : 'red'
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
                    const returnedArray = [
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

    swaps.slice(-15).forEach((swap, idx) => {
        if (activePool === swap.pool) {
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
