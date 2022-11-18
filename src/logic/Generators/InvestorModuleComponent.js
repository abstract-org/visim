import { BlockUI } from 'primereact/blockui'
import { Button } from 'primereact/button'
import { Message } from 'primereact/message'
import React, { useRef, useState } from 'react'

import useExpertModeStore from '../../stores/expertMode.store'
import { AceEditorWrapped } from './AceEditor'
import { InPlaceElement } from './InPlaceComponents'

export const InvestorModuleComponent = (props) => {
    const strDraft = JSON.stringify({ ...props.state }, null, 2)
    const [draft, saveDraft] = useState(strDraft)

    const isExpert = useExpertModeStore((state) => state.isExpert)

    const aliasAlert = useRef(null)
    const userMode = <UserModeComponent {...props} />
    const expertMode = (
        <ExpertModeComponent {...props} draft={draft} saveDraft={saveDraft} />
    )

    const CurrentMode = isExpert ? expertMode : userMode
    return (
        <React.Fragment>
            <div className="flex flex-column gen-card">
                <div className="header flex">
                    <div className="flex flex-grow-1">
                        <span className="inplace-static-text">Investor -</span>
                        <div className="flex flex-grow-none">
                            <InPlaceElement
                                id="invGenName"
                                active={isExpert ? false : true}
                                display={props.state.invGenName}
                                type="text"
                                element="input"
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
                                icon="pi pi-save"
                                className="w-2rem h-2rem p-button-success mr-2"
                                onClick={() => props.handleChangeExpert(draft)}
                            />
                            <Button
                                icon="pi pi-trash"
                                className="w-2rem h-2rem p-button-danger"
                                onClick={() =>
                                    props.handleDelete(props.state.invGenAlias)
                                }
                            />
                        </div>
                    </div>
                </div>
                <div id="editorInv">
                    <div
                        style={{
                            color: 'red',
                            backgroundColor: '#272822',
                            fontStyle: 'italic',
                            fontSize: 14
                        }}
                    >
                        Don't change the alias "invGenAlias"
                    </div>
                    {CurrentMode}
                </div>
            </div>
        </React.Fragment>
    )
}

const ExpertModeComponent = (props) => {
    return (
        <AceEditorWrapped
            state={props.draft}
            onChange={props.saveDraft}
            onBlur={props.handleChangeExpert}
        />
    )
}

const UserModeComponent = (props) => {
    const quests = props.quests
    const questConfigs = props.questConfigs

    const defaultOptions = [
        {
            label: 'Select Template',
            value: ''
        }
    ]
    const questOptions = questConfigs.map((gen) => ({
        label: `#${gen.questGenName}`,
        value: gen.questGenAlias
    }))
    const dropdownOptions = Array.prototype.concat(defaultOptions, questOptions)

    const defaultOption = [{ label: 'Select Quest', value: '' }]
    const dropdownQuests = quests.map((quest) => ({
        label: quest,
        value: quest
    }))
    const dropdownQuestsOptions = Array.prototype.concat(
        defaultOption,
        dropdownQuests
    )

    const hopsDropdown = Array.from([1, 2, 3, 4]).map((el) => ({
        label: `${el} hop${el > 1 ? 's' : ''}`,
        value: el
    }))

    const swapDirDropdown = Array.from(['buy', 'sell']).map((el) => ({
        label: el.charAt(0).toUpperCase() + el.slice(1),
        value: el
    }))

    return (
        <React.Fragment>
            <div className="column flex">
                <span className="inplace-static-text">
                    Daily probability to spawn
                </span>
                <InPlaceElement
                    id="dailySpawnProbability"
                    active={false}
                    display={`${props.state.dailySpawnProbability}%`}
                    type="number"
                    element="input"
                    handleChange={props.handleChange}
                    state={props.state}
                />
            </div>
            <div className="column flex">
                <span className="inplace-static-text">
                    USDC Initial Balance
                </span>
                <InPlaceElement
                    id="initialBalance"
                    active={false}
                    display={props.state.initialBalance}
                    type="number"
                    element="input"
                    handleChange={props.handleChange}
                    state={props.state}
                />
            </div>
            <hr className="dashed-divider" />
            <div className="column flex">
                <span className="inplace-static-text">Every</span>
                <InPlaceElement
                    id="buySellPeriodDays"
                    active={false}
                    display={props.state.buySellPeriodDays}
                    type="number"
                    element="input"
                    handleChange={props.handleChange}
                    state={props.state}
                />
                <span className="inplace-static-text">days:</span>
            </div>
            <div className="column flex">
                <BlockUI
                    blocked={props.state.buySellPeriodDays <= 0}
                    className="flex w-full"
                >
                    <span className="inplace-static-text">Buys using</span>
                    <InPlaceElement
                        id="buySinglePerc"
                        active={false}
                        display={`${props.state.buySinglePerc}%`}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">
                        of their balance in
                    </span>

                    <InPlaceElement
                        id="includeSingleName"
                        active={true}
                        display={props.state.includeSingleName}
                        element="dropdown"
                        options={dropdownQuestsOptions}
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                </BlockUI>
            </div>
            <div className="column flex mt-2">
                <BlockUI
                    blocked={props.state.buySellPeriodDays <= 0}
                    className="flex w-full"
                >
                    <span className="inplace-static-text">Buys using</span>
                    <InPlaceElement
                        id="buySumPerc"
                        active={false}
                        display={`${props.state.buySumPerc}%`}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">
                        of their balance in
                    </span>

                    <InPlaceElement
                        id="buyInvestorPerc"
                        active={false}
                        display={`${props.state.buyInvestorPerc}%`}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">
                        investors that are top
                    </span>

                    <InPlaceElement
                        id="buyGainerPerc"
                        active={false}
                        display={`${props.state.buyGainerPerc}%`}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">gainers (up to</span>
                    <InPlaceElement
                        id="buyGainersFrequency"
                        active={false}
                        display={props.state.buyGainersFrequency}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">days)</span>
                </BlockUI>
            </div>
            <div className="column flex">
                <BlockUI
                    blocked={props.state.buySellPeriodDays <= 0}
                    className="flex w-full"
                >
                    <span className="inplace-static-text">
                        Exclude quest from direct investment:
                    </span>
                    <InPlaceElement
                        id="excludeSingleName"
                        active={true}
                        display={props.state.excludeSingleName}
                        element="dropdown"
                        options={dropdownQuestsOptions}
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                </BlockUI>
            </div>
            <div className="column flex">
                <BlockUI
                    blocked={props.state.buySellPeriodDays <= 0}
                    className="flex w-full"
                >
                    <InPlaceElement
                        id="swapDecDir"
                        active={false}
                        display={`${
                            props.state.swapDecDir.charAt(0).toUpperCase() +
                            props.state.swapDecDir.slice(1)
                        }`}
                        element="dropdown"
                        options={swapDirDropdown}
                        handleChange={props.handleChange}
                        state={props.state}
                        displayStyle={{ padding: 0 }}
                    />
                    <InPlaceElement
                        id="swapIncSumPerc"
                        active={false}
                        display={`${props.state.swapIncSumPerc}%`}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">
                        of owned tokens that decreased in price by
                    </span>
                    <InPlaceElement
                        id="swapIncByPerc"
                        active={false}
                        display={`${props.state.swapIncByPerc}%`}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">(up to</span>
                    <InPlaceElement
                        id="swapDecFrequency"
                        active={false}
                        display={props.state.swapDecFrequency}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">days)</span>
                </BlockUI>
            </div>
            <div className="column flex">
                <BlockUI
                    blocked={props.state.buySellPeriodDays <= 0}
                    className="flex w-full"
                >
                    <InPlaceElement
                        id="swapIncDir"
                        active={false}
                        display={`${
                            props.state.swapIncDir.charAt(0).toUpperCase() +
                            props.state.swapIncDir.slice(1)
                        }`}
                        element="dropdown"
                        options={swapDirDropdown}
                        handleChange={props.handleChange}
                        state={props.state}
                        displayStyle={{ padding: 0 }}
                    />
                    <InPlaceElement
                        id="swapDecSumPerc"
                        active={false}
                        display={`${props.state.swapDecSumPerc}%`}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">
                        of owned tokens that increased in price by
                    </span>
                    <InPlaceElement
                        id="swapDecByPerc"
                        active={false}
                        display={`${props.state.swapDecByPerc}%`}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">(up to</span>
                    <InPlaceElement
                        id="swapIncFrequency"
                        active={false}
                        display={props.state.swapIncFrequency}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">days)</span>
                </BlockUI>
            </div>

            <hr className="dashed-divider" />

            <div className="column flex">
                <BlockUI
                    blocked={props.state.buySellPeriodDays > 0}
                    className="flex w-full"
                >
                    <span className="inplace-static-text">
                        On initialization create quest of type
                    </span>
                    <InPlaceElement
                        id="createQuest"
                        active={true}
                        display={props.state.createQuest}
                        element="dropdown"
                        options={dropdownOptions}
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                </BlockUI>
            </div>
            <div className="column flex">
                <BlockUI
                    blocked={props.state.buySellPeriodDays > 0}
                    className="flex w-full"
                >
                    <span className="inplace-static-text">Once every</span>
                    <InPlaceElement
                        id="keepCreatingPeriodDays"
                        active={false}
                        display={`${props.state.keepCreatingPeriodDays}`}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">
                        days, create quest of type
                    </span>
                    <InPlaceElement
                        id="keepCreatingQuests"
                        active={true}
                        display={props.state.keepCreatingQuests}
                        element="dropdown"
                        options={dropdownOptions}
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                </BlockUI>
            </div>
            <div className="column flex mt-3">
                <BlockUI
                    blocked={props.state.buySellPeriodDays > 0}
                    className="flex w-full"
                >
                    <span className="inplace-static-text">Every</span>
                    <InPlaceElement
                        id="valueSellPeriodDays"
                        active={false}
                        display={props.state.valueSellPeriodDays}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">days sells</span>
                    <InPlaceElement
                        id="valueSellAmount"
                        active={false}
                        display={props.state.valueSellAmount}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">
                        USDC value of their own quest tokens
                    </span>
                </BlockUI>
            </div>
            <hr className="dashed-divider" />
            <BlockUI
                blocked={props.state.buySellPeriodDays <= 0}
                className="flex w-full"
            >
                <div className="ml-2 flex mt-3">
                    <span className="inplace-static-text">
                        When bought a quest, chance to cite other random quest
                        is
                    </span>
                    <InPlaceElement
                        id="keepCitingProbability"
                        active={false}
                        display={`${props.state.keepCitingProbability}%`}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">with amount</span>
                    <InPlaceElement
                        id="keepCitingSumPercentage"
                        active={false}
                        display={`${props.state.keepCitingSumPercentage}%`}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">
                        {' '}
                        of purchased quest.
                    </span>
                </div>
            </BlockUI>
            <BlockUI
                blocked={props.state.buySellPeriodDays <= 0}
                className="flex w-full"
            >
                <div className="flex ml-2">
                    <span className="inplace-static-text">
                        Cited price is equal or higher by at least
                    </span>
                    <InPlaceElement
                        id="keepCitingPriceHigherThan"
                        active={false}
                        display={`${props.state.keepCitingPriceHigherThan}%`}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">
                        and position multiplier
                    </span>
                    <InPlaceElement
                        id="keepCitingPosMultiplier"
                        active={false}
                        display={props.state.keepCitingPosMultiplier}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                </div>
            </BlockUI>
            <hr className="dashed-divider" />
            <div className="flex column">
                <BlockUI
                    blocked={props.state.buySellPeriodDays <= 0}
                    className="flex w-full"
                >
                    <span className="inplace-static-text">
                        Smart route hops:
                    </span>
                    <InPlaceElement
                        id="smartRouteDepth"
                        active={true}
                        display={props.state.smartRouteDepth}
                        element="dropdown"
                        options={hopsDropdown}
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                </BlockUI>
            </div>
        </React.Fragment>
    )
}
