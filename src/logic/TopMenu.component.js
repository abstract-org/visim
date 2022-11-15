import { Menubar } from 'primereact/menubar'
import { ToggleButton } from 'primereact/togglebutton'
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
        },
        {
            label: 'Expert Mode',
            icon: ''
        }
    ]

    const start = <React.Fragment />
    const end = (
        <React.Fragment>
            <ToggleButton
                checked={props.isExpert}
                onChange={(e) => props.setExpertMode(e.value)}
                onIcon="pi pi-prime"
                offIcon="pi pi-user"
                onLabel="PRO"
                offLabel="NRM"
            />
        </React.Fragment>
    )

    return <Menubar start={start} end={end} model={items} />
}
