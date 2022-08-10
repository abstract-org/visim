import React from 'react';
import { Chart } from 'primereact/chart';
import usePoolStore from '../logic/Pool/pool.store';

export const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: false,
        scales: {
            x: {
                ticks: {
                    color: '#495057'
                },
                grid: {
                    color: '#ebedef'
                }
            },
            y: {
                ticks: {
                    color: '#495057'
                },
                grid: {
                    color: '#ebedef'
                }
            }
        },
        tooltip: {
            displayColors: false,
            callbacks: {
                label: function (data) {
                    const returnedArray = [
                        'Price: ' + parseFloat(data.formattedValue).toFixed(4)
                    ]
                    return (
                        returnedArray
                    )
                },
            }
        }
    }
}

  export function PoolChart() {
    const swaps = usePoolStore(state => state.swaps)

    const data = {
        labels: [],
        datasets: [
            {
                fill: false,
                label: '',
                data: [],
                borderColor: 'black',
                tension: .4
            }
        ],
    };
    
    
    swaps.forEach((swap, idx) => {
        data.datasets[0].data.push(swap.currentPrice.toFixed(4))
        data.labels.push(idx+1)
    })

    return <div style={{height: '215px'}}>
        <Chart type="line" data={data} options={options} />
    </div>
  }

