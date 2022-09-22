import globalConfig from '../logic/config.global.json'

export const getScenario = (scenarioId) => {}

export const getScenarios = async () => {
    const response = await fetch(`${globalConfig.API_URL}/scenarios`, {
        cache: 'no-cache'
    })

    if (response.status === 200) {
        const body = await response.json()
        return body.map((scenObj) => ({
            scenarioId: scenObj.scenarioId,
            scenario: JSON.parse(window.atob(scenObj.scenario))
        }))
    }
}

export const createScenario = async (
    scenarioId,
    invConfigs,
    questConfigs,
    stateId = null
) => {
    if (!scenarioId) {
        return { status: 400, body: 'Scenario name is not provided' }
    }

    const scenario = JSON.stringify({
        scenarioId,
        scenario: window.btoa(JSON.stringify({ invConfigs, questConfigs }))
    })

    const response = await fetch(`${globalConfig.API_URL}/scenarios`, {
        cache: 'no-cache',
        method: 'post',
        body: scenario
    })
    console.log(response)

    if (response.status === 201) {
        return { status: response.status, body: 'Scenario saved successfully' }
    }

    const body = await response.json()
    return { status: response.status, body: body.body }
}
