import { isValidSnapshot, rehydrateState } from '../logic/States/states.service'
import globalConfig from '../logic/config.global.json'

const STATES_URI = `${globalConfig.API_URL}/states`

const btoaEncode = (str) => window.btoa(encodeURIComponent(str))

const atobDecode = (b64) => decodeURIComponent(window.atob(b64))

const parseEncodedObj = (objStr) => {
    try {
        const decodedStr = atobDecode(objStr)
        return JSON.parse(decodedStr)
    } catch (err) {
        console.log(err)
    }

    return undefined
}

export const getState = async (stateId) => {
    const response = await fetch(`${STATES_URI}/${stateId}`, {
        cache: 'no-cache'
    })

    if (response.status === 200) {
        const body = await response.json()
        let deserializedState
        try {
            deserializedState = JSON.parse(atobDecode(body.state))
        } catch (err) {
            console.log(err)
        }

        return {
            scenarioId: body.scenarioId,
            stateId: body.stateId,
            state: rehydrateState(deserializedState)
        }
    }
}

export const getStates = async () => {
    const response = await fetch(STATES_URI, {
        cache: 'no-cache'
    })

    if (response.status === 200) {
        const body = await response.json()

        const statesList = body.map((stateObj) => {
            const parsedState = parseEncodedObj(stateObj.state)
            const state = rehydrateState(parsedState)

            return (
                state && {
                    scenarioId: stateObj.scenarioId,
                    stateId: stateObj.stateId,
                    state
                }
            )
        })

        return statesList.filter(isValidSnapshot)
    }
}

export const createState = async (
    stateId,
    { quests, pools, investors, scenarioId = null }
) => {
    if (!stateId) {
        return {
            status: 400,
            body: 'State name is not provided'
        }
    }

    const requestBody = JSON.stringify({
        stateId,
        scenarioId,
        state: btoaEncode(
            JSON.stringify({
                quests,
                pools,
                investors
            })
        )
    })

    const response = await fetch(STATES_URI, {
        cache: 'no-cache',
        method: 'post',
        body: requestBody
    })

    if (response.status === 201) {
        return {
            status: response.status,
            body: `State [${stateId}] saved successfully`
        }
    }

    const respBody = await response.json()

    return {
        status: response.status,
        body: respBody.body
    }
}

const StatesApi = {
    getState,
    getStates,
    createState
}

export default StatesApi
