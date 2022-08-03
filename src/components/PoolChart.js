import React from 'react';
import { 
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip
)

ChartJS.defaults.font.size = 11

export const options = {
    hoverBackgroundColor: 'white',
    interaction: {
      intersect: false,
      mode: 'index',
    },
    responsive: true,
    maintainAspectRatio: false,
    parsing: {
        xAxisKey: 'block',
        yAxisKey: 'price'
    },
    plugins: {
        legend: false,
        title: {
            display: false
        },
        tooltip: {
            displayColors: false,
            callbacks: {
                title: function (data) {
                return 'Block ' + data[0].raw.block
                },
                label: function (data) {
                const returnedArray = [
                    'Price: ' + parseFloat(data.formattedValue).toFixed(3),
                    data.raw.event
                ]
                return (
                    returnedArray
                )
                },
            }
        }
    }
}

const labels = [0, 5, 10, 20, 30, 40, 50];

export const data = {
    labels,
    datasets: [
      {
        fill: false,
        label: 'Block 1',
        data: [1.001, 1.1, 1.01, 1.2],
        backgroundColor: 'black',
        borderColor: 'black',
        showLine: true,
        pointRadius: 1,
      }
    ],
  };

  export function PoolChart() {

    return <div style={{height: '215px'}}>
        <Line options={options} data={data} />;
    </div>
  }

