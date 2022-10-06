import { rehydrateState } from '../logic/States/states.service'
import Serializer, {
    fromBase64,
    parseEncodedObj,
    toBase64
} from '../logic/Utils/serializer'
import globalConfig from '../logic/config.global.json'

const STATES_URI = `${globalConfig.API_URL}/states`

export const getState = async (stateId) => {
    const response = await fetch(`${STATES_URI}/${stateId}`, {
        cache: 'no-cache'
    })

    if (response.status === 200) {
        const body = await response.json()
        const deserializedState = Serializer.deserialize(fromBase64(body.state))

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

    const respBody = await response.json()

    let snapshotList
    if (response.status === 200) {
        snapshotList = respBody.map((snapshotObj) => {
            const parsedState = parseEncodedObj(snapshotObj.state)

            return (
                parsedState && {
                    scenarioId: snapshotObj.scenarioId,
                    stateId: snapshotObj.stateId,
                    state: rehydrateState(parsedState)
                }
            )
        })

        return {
            status: response.status,
            body: snapshotList
        }
    }

    return {
        status: response.status,
        body: respBody.body
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
    const serializedState = Serializer.serialize({
        quests,
        pools,
        investors
    })

    const requestBody = {
        stateId,
        scenarioId,
        state: toBase64(serializedState)
    }

    const response = await fetch(STATES_URI, {
        cache: 'no-cache',
        method: 'post',
        body: JSON.stringify(requestBody)
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
