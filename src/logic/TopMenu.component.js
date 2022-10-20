import { Menubar } from 'primereact/menubar'
import React from 'react'

export const TopMenu = (props) => {
    const items = [
        {
            label: `${props.sidebarVisible ? 'Hide states' : 'Show states'}`,
            icon: 'pi pi-fw pi-list',
            command: () => {
                props.setSidebarVisible(!props.sidebarVisible)
            }
        },
        {
            label: `Money Flow`,
            icon: 'pi pi-fw pi-list',
            command: () => {
                props.setSidebarVisible(!props.sidebarVisible)
            }
        }
    ]

    const start = <React.Fragment></React.Fragment>

    return <Menubar model={items} start={start} />
}
