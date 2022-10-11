import globalConfig from '../logic/config.global.json'

const GET_PRESIGNED_URL = `${globalConfig.API_URL}/getPresignedUrl`

export const getPresignedUrl = async (stateId) => {
    const response = await fetch(`${GET_PRESIGNED_URL}/${stateId}`, {
        cache: 'no-cache'
    }).catch((err) => {
        console.log(err)
        return {
            status: 400,
            body: err
        }
    })

    const respBody = await response.json()

    if (respBody && respBody.message) {
        return {
            status: response.status,
            body: respBody.message
        }
    }
}
