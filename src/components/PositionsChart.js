import { 
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
)

ChartJS.defaults.font.size = 11

export function PositionsChart({height}) {

    const options = {
        interaction: {
            intersect: false,
            mode: 'index',
        },
        responsive: true,
        maintainAspectRatio: false, 
    }

    const chartData1 = {
        datasets: [
            {
                label: 'Chart 1',
                data: [{
                    x: -10,
                    y: 0
                }, {
                    x: 0,
                    y: 10
                }]
            }
        ]
    }

    return (
        <div style={{ height: height }}>
            <Scatter
                data={chartData1}
                options={options}
            />
        </div>
    );

}