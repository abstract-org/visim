import { Menubar } from 'primereact/menubar'
import React from 'react'

export const TopMenu = (props) => {
    const items = [
        {
            label: props.statesVisible ? 'Hide states' : 'Show states',
            icon: 'pi pi-fw pi-list',
            command: () => {
                props.setStatesVisible(!props.statesVisible)
            }
        },
        {
            label: props.capTableVisible ? 'Hide CapTable' : 'Show CapTable',
            icon: 'pi pi-fw pi-book',
            command: () => {
                props.setCapTableVisible(!props.capTableVisible)
            }
        },
        {
            label: `Money Flow`,
            icon: 'pi pi-fw pi-money-bill',
            command: () => {
                props.setMoneyflowVisible(!props.moneyflowVisible)
            }
        }
    ]

    const start = <React.Fragment />

    return <Menubar start={start} model={items} />
}
