import { rehydrateState } from '../logic/States/states.service'
import Serializer, {
    fromBase64,
    parseEncodedObj,
    toBase64
} from '../logic/Utils/serializer'

const isValidSnapshot = (snapshot) => snapshot && snapshot.stateId

export const createState = async (stateId, state, scenarioId = null) => {
    if (!stateId) {
        return {
            status: 400,
            body: 'State name is not provided'
        }
    }
    if (localStorage.getItem(String(stateId))) {
        return {
            status: 409,
            body: `State [${stateId}] already exists`
        }
    }

    const serializedState = Serializer.serialize(state)

    const lsValue = JSON.stringify({
        stateId,
        scenarioId,
        state: toBase64(serializedState)
    })

    localStorage.setItem(String(stateId), lsValue)

    return {
        status: 201,
        body: `State [${stateId}] saved successfully`
    }
}

export const getState = async (stateId) => {
    const snapshot = localStorage.getItem(String(stateId))

    if (snapshot) {
        const deserializedState = Serializer.deserialize(fromBase64(snapshot))

        return {
            status: 200,
            body: {
                scenarioId: snapshot.scenarioId,
                stateId: snapshot.stateId,
                state: rehydrateState(deserializedState)
            }
        }
    } else {
        return {
            status: 404,
            body: `State ${stateId} not found`
        }
    }
}

export const getStates = async () => {
    const lsValues = []
    for (let i = 0; i < localStorage.length; i++) {
        const currentKey = localStorage.key(i)
        if (currentKey) {
            lsValues.push(JSON.parse(localStorage.getItem(currentKey)))
        }
    }

    const snapshotList = lsValues.filter(isValidSnapshot).map((snapshotObj) => {
        const parsedState = parseEncodedObj(snapshotObj.state)

        return (
            parsedState && {
                stateId: snapshotObj.stateId,
                scenarioId: snapshotObj.scenarioId,
                state: rehydrateState(parsedState)
            }
        )
    })

    if (
        snapshotList &&
        Array.isArray(snapshotList) &&
        snapshotList.length > 0
    ) {
        return {
            status: 200,
            body: snapshotList
        }
    } else {
        return {
            status: 404,
            body: `No snapshots were found`
        }
    }
}

const LocalStorageApi = {
    getState,
    getStates,
    createState
}

export default LocalStorageApi
