import { positionsDefault } from '@abstract-org/sdk'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { InputNumber } from 'primereact/inputnumber'
import { ToggleButton } from 'primereact/togglebutton'
import React, { useEffect } from 'react'

import { useLocalStorage } from '../hooks/useLocalStorage'
import usePositionConfigStore from '../stores/positionConfig.store'
import './PositionConfigPopover/style.css'

const PositionConfigPopover = ({ isVisible, setVisible }) => {
    const [storagePositions, setStoragePositions] = useLocalStorage(
        'positions',
        []
    )
    const positions = usePositionConfigStore((state) => state.positions)
    const addPosition = usePositionConfigStore((state) => state.addPosition)
    const removePosition = usePositionConfigStore(
        (state) => state.removePosition
    )
    const togglePosition = usePositionConfigStore(
        (state) => state.togglePosition
    )
    const editPosition = usePositionConfigStore((state) => state.editPosition)

    useEffect(() => {
        if (storagePositions.length) {
            storagePositions.forEach((pos) => {
                addPosition(pos)
            })
        }
    }, [])

    useEffect(() => {
        console.log(`Positions amount changed ${positions.length}`)
        setStoragePositions(positions)
    }, [positions, setStoragePositions])

    const addPositionHandle = () => {
        if (positions.length > 10) {
            console.error(`Cannot create more than 10 positions`)
            return
        }

        const newPosition = {
            tokenA: 0,
            tokenB: 20000,
            priceMin: 1,
            priceMax: 1000000,
            enabled: true
        }
        addPosition(newPosition)
    }

    const updatePositionHandle = (index, field, value) => {
        const updatedPositions = positions.slice()
        updatedPositions[index][field] = value
        console.log(`Updating position ${index}`)
        editPosition(index, updatedPositions[index])
        setStoragePositions(updatedPositions)
    }

    const togglePositionHandle = (index) => {
        togglePosition(index)
    }

    const deletePositionHandle = (index) => {
        removePosition(index)
    }

    const positionElements = positions.map((position, index) => (
        <div className="p-d-flex p-ai-center position-row" key={index}>
            <label>Token0 Supply:</label>
            <InputNumber
                value={position.tokenA}
                onChange={(e) => updatePositionHandle(index, 'tokenA', e.value)}
                size={8}
            />
            <label>Token1 Supply:</label>
            <InputNumber
                value={position.tokenB}
                onChange={(e) => updatePositionHandle(index, 'tokenB', e.value)}
                size={8}
            />
            <label>Price Min:</label>
            <InputNumber
                value={position.priceMin}
                onChange={(e) =>
                    updatePositionHandle(index, 'priceMin', e.value)
                }
                size={5}
            />
            <label>Price Max:</label>
            <InputNumber
                value={position.priceMax}
                onChange={(e) =>
                    updatePositionHandle(index, 'priceMax', e.value)
                }
                size={10}
            />
            <ToggleButton
                onLabel="On"
                offLabel="Off"
                checked={position.enabled}
                onChange={(e) => togglePositionHandle(index)}
            />
            <Button
                icon="pi pi-times"
                className="p-button-rounded p-button-danger p-button-outlined"
                onClick={() => deletePositionHandle(index)}
            />
        </div>
    ))

    const renderFooter = () => (
        <div>
            <Button label="New Position" onClick={addPositionHandle} />
        </div>
    )
    const positionText = positionsDefault.map((p, i) => (
        <React.Fragment key={i}>
            {`Price Range: ${p.priceMin}-${p.priceMax}`}
            <br />
            {`Supply Token A: ${p.tokenA}`} / {`Supply Token B: ${p.tokenB}`}
            <br />
            <br />
        </React.Fragment>
    ))

    const prefixedPositionText = (
        <React.Fragment>
            {`No custom positions defined, using default:`}
            <br />
            <br />
            {positionText}
        </React.Fragment>
    )

    return (
        <div>
            <Dialog
                visible={isVisible}
                onHide={() => setVisible(false)}
                footer={renderFooter()}
                header="Position Manager"
            >
                {positionElements.length
                    ? positionElements
                    : prefixedPositionText}
            </Dialog>
        </div>
    )
}

export default PositionConfigPopover
