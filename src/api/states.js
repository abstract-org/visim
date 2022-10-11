import { rehydrateState } from '../logic/States/states.service'
import { fromBase64, toBase64 } from '../logic/Utils/logicUtils'
import Serializer, { deserialize } from '../logic/Utils/serializer'
import globalConfig from '../logic/config.global.json'

const STATES_URI = `${globalConfig.API_URL}/states`

export const getStates = async () => {
    const response = await fetch(STATES_URI, {
        cache: 'no-cache'
    }).catch((err) => {
        console.log(err)
        return {
            status: 400,
            body: err
        }
    })

    const respBody = await response.json()

    let snapshotList
    if (response.status === 200) {
        snapshotList = respBody

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

export const createState = async (stateId, state, scenarioId = null) => {
    if (!stateId) {
        return {
            status: 400,
            body: 'State name is not provided'
        }
    }
    const serializedState = Serializer.serialize(state.state)

    const requestBody = {
        stateId,
        scenarioId,
        stateDetails: state.stateDetails,
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
    getStates,
    createState
}

export default StatesApi
