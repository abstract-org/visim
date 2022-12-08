import useDayTrackerStore from '../logic/dayTracker.store'

export function CurrentDay() {
    const currentDay = useDayTrackerStore((state) => state.currentDay)

    return (
        <div
            className="p-component"
            style={{
                textAlign: 'right',
                color: '#f00'
            }}
        >
            <h3>Day: {currentDay}</h3>
        </div>
    )
}
