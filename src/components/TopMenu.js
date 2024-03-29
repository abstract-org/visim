import { Button } from 'primereact/button'
import { InputText } from 'primereact/inputtext'
import { Menubar } from 'primereact/menubar'
import { Toast } from 'primereact/toast'
import { ToggleButton } from 'primereact/togglebutton'
import React, { useRef, useState } from 'react'

import { useSupabaseAuth } from '../contexts/SupabaseAuthContext'

export const TopMenu = (props) => {
    const { user, signIn, signOut } = useSupabaseAuth()
    const [email, setEmail] = useState('')
    const [sendingEmail, setSendingEmail] = useState(false)
    const toast = useRef(null)
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
            label: `Price Bands`,
            icon: 'pi pi-fw pi-chart-line',
            command: () => {
                props.setVisible(!props.isVisible)
            }
        }
    ]

    const onLoginClick = async () => {
        try {
            setSendingEmail(true)
            const { error } = await signIn({ email: email })

            if (!error) {
                toast.current.show({
                    severity: 'success',
                    detail: 'Confirmation email has been sent!',
                    life: 2000
                })
            } else {
                toast.current.show({
                    severity: 'error',
                    detail: `Only agora-labs email domains allowed!`,
                    life: 2000
                })
            }

            setEmail('')
        } catch (error) {
            toast.current.show({
                severity: 'error',
                detail: `Something went wrong. ${error.message}`,
                life: 2000
            })
        } finally {
            setSendingEmail(false)
        }
    }
    const onLogoutClick = async () => {
        try {
            const { error } = await signOut()

            if (error) {
                toast.current.show({
                    severity: 'error',
                    detail: `Something went wrong. ${error.message}`,
                    life: 2000
                })
            }
        } catch (error) {
            toast.current.show({
                severity: 'error',
                detail: `Something went wrong. ${error.message}`,
                life: 2000
            })
        }
    }

    const end = (
        <div className="flex align-items-center gap-3">
            {user ? (
                <React.Fragment>
                    <span>
                        Logged in as <strong>{user.email}</strong>
                    </span>
                    <Button label="Logout" onClick={onLogoutClick} />
                </React.Fragment>
            ) : (
                <React.Fragment>
                    <InputText
                        placeholder="Seed"
                        className="w-15rem"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <Button
                        loading={sendingEmail}
                        disabled={sendingEmail}
                        label="Login"
                        onClick={onLoginClick}
                    />
                </React.Fragment>
            )}
            <ToggleButton
                checked={props.isExpert}
                onChange={(e) => props.setExpertMode(e.value)}
                onIcon="pi pi-prime"
                offIcon="pi pi-user"
                onLabel="PRO"
                offLabel="NRM"
            />
        </div>
    )

    return (
        <React.Fragment>
            <Menubar model={items} end={end} />
            <Toast ref={toast} />
        </React.Fragment>
    )
}
