import { Inplace, InplaceContent, InplaceDisplay } from 'primereact/inplace'
import { InputText } from 'primereact/inputtext'
import { Dropdown } from 'primereact/dropdown'
import { Button } from 'primereact/button'
import { TabView, TabPanel } from 'primereact/tabview'

import { useState } from 'react'

export const InvestorRandomGenerator = () => {
    const [active, setActiveIndex] = useState(0)
    const [count, setCount] = useState(0)
    const handleNewInvestorGen = (e) => {
        setActiveIndex(e.index)
        setCount(count + 1)
    }

    return (
        <TabView
            activeIndex={active}
            onTabChange={(e) => setActiveIndex(e.index)}
            scrollable
        >
            <TabPanel
                headerTemplate={
                    <Button
                        label="Create Investor"
                        icon="pi pi-plus"
                        className="px-2 p-button-secondary"
                        onClick={handleNewInvestorGen}
                    ></Button>
                }
            />
            {Array.from({ length: count }, (_, i) => ({
                title: 'Header ' + (i + 1),
                content: <GenCardInvestor />
            })).map((tab) => {
                return (
                    <TabPanel
                        leftIcon="pi pi-money-bill"
                        key={tab.title}
                        header={tab.title}
                        closable
                    >
                        {tab.content}
                    </TabPanel>
                )
            })}
        </TabView>
    )
}

export const GenCardInvestor = () => {
    return (
        <div className="flex flex-column gen-card">
            <div className="header flex">
                <div className="flex flex-grow-1">
                    <span className="inplace-static-text">Investor -</span>
                    <InPlaceElement
                        active={true}
                        display="Small Author"
                        type="text"
                        component="input"
                    />
                </div>
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    Daily probability to spawn
                </span>
                <InPlaceElement
                    active={false}
                    display="20%"
                    type="number"
                    component="input"
                />
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    USDC Initial Balance
                </span>
                <InPlaceElement
                    active={false}
                    display="0%"
                    type="number"
                    component="input"
                />
            </div>
            <div className="column flex">
                <span className="inplace-static-text">Buys using</span>
                <InPlaceElement
                    active={false}
                    display="0%"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">of his balance in</span>

                <InPlaceElement
                    active={false}
                    display="0%"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">quests that are top</span>

                <InPlaceElement
                    active={false}
                    display="0%"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">gainers</span>
            </div>
            <div className="column flex">
                <span className="inplace-static-text">Sell</span>
                <InPlaceElement
                    active={false}
                    display="0%"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">
                    of owned tokens that decreased in price by
                </span>
                <InPlaceElement
                    active={false}
                    display="0"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">over</span>
                <InPlaceElement
                    active={false}
                    display="0"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">days</span>
            </div>
            <div className="column flex">
                <span className="inplace-static-text">Sell</span>
                <InPlaceElement
                    active={false}
                    display="0%"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">
                    of owned tokens that increased in price by
                </span>
                <InPlaceElement
                    active={false}
                    display="0"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">over</span>
                <InPlaceElement
                    active={false}
                    display="0"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">days</span>
            </div>
            <div className="column flex">
                <span className="inplace-static-text">Create a</span>
                <InPlaceElement
                    active={false}
                    display="Small Scale"
                    component="dropdown"
                    options={[
                        {
                            value: 'small',
                            label: 'Small Scale'
                        }
                    ]}
                    value="small"
                />
                <span className="inplace-static-text">
                    quest on initialization
                </span>
            </div>
            <div className="column flex">
                <span className="inplace-static-text">Every</span>
                <InPlaceElement
                    active={false}
                    display="30"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">days sells</span>
                <InPlaceElement
                    active={false}
                    display="5000"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">
                    value of his own created quest
                </span>
            </div>
        </div>
    )
}

export const GenCardQuest = () => {
    return (
        <div className="flex flex-column gen-card">
            <div className="header flex">
                <div className="flex flex-grow-1">
                    <span className="inplace-static-text">Investor -</span>
                    <InPlaceElement
                        active={true}
                        display="Small Author"
                        type="text"
                        component="input"
                    />
                </div>
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    Daily probability to spawn
                </span>
                <InPlaceElement
                    active={false}
                    display="20%"
                    type="number"
                    component="input"
                />
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    USDC Initial Balance
                </span>
                <InPlaceElement
                    active={false}
                    display="0%"
                    type="number"
                    component="input"
                />
            </div>
            <div className="column flex">
                <span className="inplace-static-text">Buys using</span>
                <InPlaceElement
                    active={false}
                    display="0%"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">of his balance in</span>

                <InPlaceElement
                    active={false}
                    display="0%"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">quests that are top</span>

                <InPlaceElement
                    active={false}
                    display="0%"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">gainers</span>
            </div>
            <div className="column flex">
                <span className="inplace-static-text">Sell</span>
                <InPlaceElement
                    active={false}
                    display="0%"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">
                    of owned tokens that decreased in price by
                </span>
                <InPlaceElement
                    active={false}
                    display="0"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">over</span>
                <InPlaceElement
                    active={false}
                    display="0"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">days</span>
            </div>
            <div className="column flex">
                <span className="inplace-static-text">Sell</span>
                <InPlaceElement
                    active={false}
                    display="0%"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">
                    of owned tokens that increased in price by
                </span>
                <InPlaceElement
                    active={false}
                    display="0"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">over</span>
                <InPlaceElement
                    active={false}
                    display="0"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">days</span>
            </div>
            <div className="column flex">
                <span className="inplace-static-text">Create a</span>
                <InPlaceElement
                    active={false}
                    display="Small Scale"
                    component="dropdown"
                    options={[
                        {
                            value: 'small',
                            label: 'Small Scale'
                        }
                    ]}
                    value="small"
                />
                <span className="inplace-static-text">
                    quest on initialization
                </span>
            </div>
            <div className="column flex">
                <span className="inplace-static-text">Every</span>
                <InPlaceElement
                    active={false}
                    display="30"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">days sells</span>
                <InPlaceElement
                    active={false}
                    display="5000"
                    type="number"
                    component="input"
                />
                <span className="inplace-static-text">
                    value of his own created quest
                </span>
            </div>
        </div>
    )
}

const InPlaceElement = (props) => {
    return (
        <Inplace active={props.active || false} closable>
            <InplaceDisplay>{props.display}</InplaceDisplay>
            <InplaceContent>
                {props.component === 'input' ? (
                    <PresetInPlaceInput {...props} />
                ) : (
                    <PresetInPlaceDropdown {...props} />
                )}
            </InplaceContent>
        </Inplace>
    )
}

const PresetInPlaceInput = (props) => {
    return (
        <InputText
            autoFocus
            type={props.type || 'text'}
            className="block p-inputtext-sm"
        />
    )
}

const PresetInPlaceDropdown = (props) => {
    return <Dropdown value={props.value} options={props.options} />
}
