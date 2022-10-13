import { BlockUI } from 'primereact/blockui'
import { Button } from 'primereact/button'
import { Message } from 'primereact/message'
import { useRef } from 'react'

import { InPlaceElement } from './InPlaceComponents'

export const InvestorModuleComponent = (props) => {
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

    const aliasAlert = useRef(null)
    return (
        <div className="flex flex-column gen-card">
            <div className="header flex">
                <div className="flex flex-grow-1">
                    <span className="inplace-static-text">Investor -</span>
                    <div className="flex flex-grow-none">
                        <InPlaceElement
                            id="invGenName"
                            active={true}
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
                            icon="pi pi-trash"
                            className="w-2rem h-2rem p-button-danger"
                            onClick={() =>
                                props.handleDelete(props.state.invGenAlias)
                            }
                        />
                    </div>
                </div>
            </div>
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
                        id="buyQuestPerc"
                        active={false}
                        display={`${props.state.buyQuestPerc}%`}
                        type="number"
                        element="input"
                        handleChange={props.handleChange}
                        state={props.state}
                    />
                    <span className="inplace-static-text">
                        quests that are top
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
                        id="sellDecByPerc"
                        active={false}
                        display={`${props.state.sellDecByPerc}%`}
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
                        On initialization create Quest
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
        </div>
    )
}
