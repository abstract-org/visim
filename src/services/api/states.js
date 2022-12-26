import globalConfig from '../config.global.json'

const STATES_URI = `${globalConfig.API_URL}/states`

export const getStates = async () => {
    const response = await fetch(STATES_URI, {
        cache: 'no-cache'
    })

    const respBody = await response.json()

    let snapshotList
    if (response.status === 200) {
        snapshotList = respBody.message

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

export const createStateRecord = async (
    stateId,
    stateDetails,
    stateLocation,
    scenarioId = null
) => {
    if (!stateId) {
        return {
            status: 400,
            body: 'State name is not provided'
        }
    }

    const requestBody = {
        stateId,
        scenarioId,
        stateLocation: stateLocation,
        stateDetails: stateDetails
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
    createStateRecord
}

export default StatesApi
