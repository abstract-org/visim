import { Button } from 'primereact/button'
import { Checkbox } from 'primereact/checkbox'
import { Message } from 'primereact/message'
import { useRef } from 'react'

import { InPlaceElement } from './InPlaceComponents'

export const QuestModuleComponent = (props) => {
    const aliasAlert = useRef(null)
    const quests = props.quests

    const defaultOption = [{ label: 'Select Quest', value: '' }]
    const dropdownQuests = quests.map((quest) => ({
        label: quest,
        value: quest
    }))
    const dropdownQuestsOptions = Array.prototype.concat(
        defaultOption,
        dropdownQuests
    )

    return (
        <div className="flex flex-column gen-card">
            <div className="header flex">
                <span className="inplace-static-text">Quest -</span>
                <div className="flex flex-grow-none">
                    <InPlaceElement
                        id="questGenName"
                        active={true}
                        display={props.state.questGenName}
                        element="input"
                        type="text"
                        handleChange={props.handleChange}
                        state={props.state}
                        style={{ width: '14rem' }}
                    />
                </div>

                <div className="flex flex-grow-1 justify-content-end">
                    <Message
                        className="alias-alert"
                        severity="error"
                        text="Alias is required"
                        ref={aliasAlert}
                        style={{ display: 'none' }}
                    />
                    <div className="mr-3"></div>
                    <Button
                        icon="pi pi-trash"
                        className="w-2rem h-2rem p-button-danger"
                        onClick={() =>
                            props.handleDelete(props.state.questGenAlias)
                        }
                    />
                </div>
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    Initial investment from author
                </span>
                <InPlaceElement
                    id="initialAuthorInvest"
                    active={false}
                    display={props.state.initialAuthorInvest}
                    type="number"
                    element="input"
                    handleChange={props.handleChange}
                    state={props.state}
                />
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    Initial token price: 1
                </span>
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    Initial positions: 1...10000, 20...10000, 50...10000,
                    200...10000
                </span>
            </div>
            <div className="column flex">
                <span className="inplace-static-text">Probability to cite</span>
                <InPlaceElement
                    id="citeSingleName"
                    active={true}
                    display={props.state.citeSingleName}
                    element="dropdown"
                    options={dropdownQuestsOptions}
                    handleChange={props.handleChange}
                    state={props.state}
                />
                <InPlaceElement
                    id="probCiteSingle"
                    active={false}
                    display={`${props.state.probCiteSingle}%`}
                    type="number"
                    element="input"
                    handleChange={props.handleChange}
                    state={props.state}
                />
            </div>
            {props.state.citeSingleName ? (
                <div className="column flex">
                    <span className="inplace-static-text">
                        Portion of tokens used for citing{' '}
                        {props.state.citeSingleName}
                    </span>
                    <InPlaceElement
                        id="singleCitePerc"
                        active={false}
                        display={`${props.state.singleCitePerc}%`}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">
                        (position price multiplier:
                    </span>
                    <InPlaceElement
                        id="citeSingleMultiplier"
                        active={false}
                        display={props.state.citeSingleMultiplier}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">)</span>
                </div>
            ) : (
                ''
            )}
            <div className="column flex">
                <span className="inplace-static-text">
                    Probability to cite other papers
                </span>
                <InPlaceElement
                    id="probRandomCite"
                    active={false}
                    display={`${props.state.probRandomCite}%`}
                    type="number"
                    element="input"
                    handleChange={props.handleChange}
                    state={props.state}
                />
                <span className="inplace-static-text">
                    (position price multiplier:
                </span>
                <InPlaceElement
                    id="citeRandomMultiplier"
                    active={false}
                    display={props.state.citeRandomMultiplier}
                    type="number"
                    element="input"
                    handleChange={props.handleChange}
                    state={props.state}
                />
                <span className="inplace-static-text">)</span>
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    Portion of tokens used for other citings
                </span>
                <InPlaceElement
                    id="randomCitePerc"
                    active={false}
                    display={`${props.state.randomCitePerc}%`}
                    type="number"
                    element="input"
                    handleChange={props.handleChange}
                    state={props.state}
                />
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    Prefer own quests for citation (can be mixed with random):{' '}
                </span>
                <Checkbox
                    id="citeRandomPreferOwn"
                    onChange={props.handleChange}
                    checked={props.state.citeRandomPreferOwn}
                ></Checkbox>
            </div>
        </div>
    )
}
