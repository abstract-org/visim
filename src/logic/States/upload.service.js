import { toBase64 } from '../Utils/logicUtils'
import Serializer from '../Utils/serializer'

/**
 * @description Uploads state directly to S3 with presigned URL
 * @param {string} stateId
 * @returns {{}|{statusCode:number,message:string}}}
 */
export const uploadStateTo = async (presignedUrl, state) => {
    const serializedState = Serializer.serialize(state.state)

    const result = await fetch(presignedUrl, {
        method: 'PUT',
        body: toBase64(serializedState)
    }).catch((err) => {
        return JSON.stringify(err)
    })

    if (!result && !result.ok) {
        return `${result.status}: ${result.statusText}`
    }

    return result
}
