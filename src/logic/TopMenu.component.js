import {Menubar} from 'primereact/menubar'
import React, {useRef} from 'react'
import {Button} from 'primereact/button'
import {useSupabaseAuth} from "./Supabase/Supabase.components";
import {Toast} from "primereact/toast";

export const TopMenu = (props) => {
    const {user, signIn, signOut} = useSupabaseAuth();
    const toast = useRef(null);
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

    const onLoginClick = async () => {
        try {
            const {error} = await signIn({email: 'nikita@agora-labs.com'});

            if (!error) {
                toast.current.show({
                    severity: 'success',
                    detail: 'Confirmation email has been sent!',
                    life: 2000
                })
            } else {
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
    };
    const onLogoutClick = async () => {
        try {
            const {error} = await signOut();

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
    };

    const end = user ?
        <div className="flex align-items-center gap-3">
            <span>Logged in as {user.email}</span>
            <Button label="Logout" onClick={onLogoutClick}/>
        </div> : <Button label="Login" onClick={onLoginClick}/>

    return <>
        <Menubar model={items} end={end}/>
        <Toast ref={toast}/>
    </>
}
