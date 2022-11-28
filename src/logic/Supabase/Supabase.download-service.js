import HashMap from 'hashmap'

import { convertArrayToHashMapByKey } from '../Utils/serializer'
import { SupabaseClient, TABLE } from './SupabaseClient'
import {
    InvestorDto,
    PoolDto,
    ScenarioInvestorConfigDto,
    ScenarioQuestConfigDto,
    SnapshotWithTotalsDto
} from './dto'

export const fetchTotalsById = async (snapshotId) => {
    const { data, error } = await SupabaseClient.from(TABLE.snapshot)
        .select(`*, ${TABLE.snapshot_totals}(*)`)
        .eq(`${TABLE.snapshot}.id`, snapshotId)
        .limit(1)
        .single()

    console.debug('fetchTotalsById().data:', data)
    if (error) {
        console.error('fetchTotalsById().error:', error)
    }

    return new SnapshotWithTotalsDto(data).toObj()
}

export const fetchTotalsList = async () => {
    const { data, error } = await SupabaseClient.from(TABLE.snapshot).select(
        `*, ${TABLE.snapshot_totals}(*)`
    )

    console.debug('fetchTotalsList().data:', data)
    if (error) {
        console.error('fetchTotalsList().error:', error)
    }

    return data.map((snapshotData) =>
        new SnapshotWithTotalsDto(snapshotData).toObj()
    )
}

const getQuerySnapshotById = ({ T } = { T: TABLE }) => `*,
        scenario (
            ${T.scenario_investor_config}(*),
            ${T.scenario_quest_config}(*)
        ),
        ${T.snapshot_investor}(
            ${T.investor}(
                *,
                ${T.investor_balances}(
                    ${T.quest}(name),
                    balance,
                    day
                ),
                quests:${T.quest}(name)
            )
        ),
        ${T.snapshot_pool}(
            ${T.pool}(
                *,
                left:token0(name),
                right:token1(name),
                ${T.pool_data}(*),
                ${T.position}(*),
                ${T.position_owner}(*)
            )
        ),
        ${T.snapshot_quest}(
            ${T.quest}(*)
        )`

export const fetchSnapshotById = async (snapshotId) => {
    try {
        const snapshotResponse = await SupabaseClient.from(TABLE.snapshot)
            .select(getQuerySnapshotById())
            .eq('id', snapshotId)
            .limit(1)
            .single()

        if (snapshotResponse.error) {
            console.error(snapshotResponse.error.message)
            return null
        }

        return gatherStateFromSnapshot(snapshotResponse.data)
    } catch (err) {
        console.error('ERR: fetchTotalsById()', err)
        return null
    }
}

const gatherStateFromSnapshot = (data) => {
    let newState = {
        generatorStore: { invConfigs: [], questConfigs: [] },
        investorStore: { investors: [] },
        investors: new HashMap(),
        logStore: { logObjs: [] },
        poolStore: {
            pools: [] /* pool names */,
            swaps: [],
            active: '' /* active pool*/,
            swapMode: 'smart'
        },
        pools: new HashMap(),
        questStore: {
            quests: Array(21),
            humanQuests: Array(1),
            selectedQuests: Array(0),
            active: '',
            proMode: false
        },
        quests: new HashMap(),
        /* not ready yet */
        poolsdayTrackerStore: { currentDay: 0 },
        moneyDist: {
            citing: [],
            buying: [],
            selling: [],
            buyingSmart: [],
            sellingSmart: []
        }
    }

    newState.generatorStore = transformScenario(data.scenario)

    const investorDtoList = data.snapshot_investor.map(
        (ssInv) => new InvestorDto(ssInv.investor)
    )
    newState.investorStore.investors = investorDtoList.map((invDto) =>
        invDto.toHash()
    )

    newState.investors = convertArrayToHashMapByKey(
        investorDtoList.map((invDto) => invDto.toInvestor()),
        'hash'
    )

    const poolDtoList = data.snapshot_pool.map(
        (ssPool) => new PoolDto(ssPool.pool)
    )
    newState.poolStore.pools = poolDtoList.map((poolDto) => poolDto.toName())

    newState.pools = convertArrayToHashMapByKey(
        poolDtoList.map((poolDto) => poolDto.toPool()),
        'name'
    )

    console.debug(newState)

    return newState
}

const transformScenario = (scenario) => {
    return {
        invConfigs: scenario.scenario_investor_config.map((cfg) =>
            new ScenarioInvestorConfigDto(cfg).toObj()
        ),
        questConfigs: scenario.scenario_quest_config.map((cfg) =>
            new ScenarioQuestConfigDto(cfg).toObj()
        )
    }
}

const getQueryScenarioById = () => `id, *,
        scenario_investor_config(*),
        scenario_quest_config(*)`

export const fetchScenarioById = async (scenarioId) => {
    try {
        const scenarioResponse = await SupabaseClient.from(TABLE.scenario)
            .select(getQueryScenarioById())
            .eq('id', scenarioId)

        return scenarioResponse.data
    } catch (err) {}
}
