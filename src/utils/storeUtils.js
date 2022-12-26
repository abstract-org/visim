export const overrideState = (stateObj, newData = {}, initialState = {}) => {
    let newState = initialState
    if (newData) {
        Object.entries(newData).forEach(([key, newValue]) => {
            if (stateObj.hasOwnProperty(key) && newData[key]) {
                newState[key] = newValue
            }
        })
    }

    return newState
}

export const updateStateInvestorConfig = (arr, newItem) =>
    arr.map((item) =>
        item.invGenAlias === newItem.invGenAlias ? newItem : item
    )

export const updateStateQuestConfig = (arr, newItem) =>
    arr.map((item) =>
        item.questGenAlias === newItem.questGenAlias ? newItem : item
    )

export const deleteStateInvestorConfig = (arr, invGenAlias) =>
    arr.filter((item) => item.invGenAlias !== invGenAlias)

export const deleteStateQuestConfig = (arr, questGenAlias) =>
    arr.filter((item) => item.questGenAlias !== questGenAlias)
