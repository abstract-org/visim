import HashMap from 'hashmap'

import { createHashMappings } from '../Utils/logicUtils'
import { convertArrayToHashMapByKey } from '../Utils/serializer'
import { SupabaseClient, TABLE } from './SupabaseClient'
import {
    InvestorDto,
    LogDto,
    PoolDto,
    QuestDto,
    ScenarioInvestorConfigDto,
    ScenarioQuestConfigDto,
    SnapshotWithTotalsDto,
    SwapDto
} from './dto'

export const fetchTotalsById = async (snapshotId) => {
    const { data, error } = await SupabaseClient.from(TABLE.snapshot)
        .select(`*, ${TABLE.snapshot_totals}(*)`)
        .eq(`${TABLE.snapshot}.id`, snapshotId)
        .limit(1)
        .single()

    if (error) {
        console.error('fetchTotalsById().error:', error)
    }

    return new SnapshotWithTotalsDto(data).toObj()
}

export const fetchTotalsList = async () => {
    const { data, error } = await SupabaseClient.from(TABLE.snapshot).select(
        `*, ${TABLE.snapshot_totals}(*)`
    )

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
        ${T.investor}(
            *,
            ${T.investor_balances}(
                ${T.quest}(name),
                balance,
                day
            ),
            quests:${T.quest}(name)
        ),
        ${T.pool} (
            *,
            left:token0(name),
            right:token1(name),
            ${T.pool_data}(*),
            ${T.position}(*),
            ${T.position_owner}(*),
            ${T.log}(
                *, 
                pool (name),
                investor (hash)
            ),
            ${T.swap}(*)
        ),
        ${T.quest}(
            *,
            investor (
                name,
                hash
            )
        )
        `

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

const aggregateInvestorsForStore = (data) => {
    const investorDtoList = data.map((ssInv) => new InvestorDto(ssInv))

    return {
        investorStoreInvestors: investorDtoList.map((invDto) =>
            invDto.toHash()
        ),
        investors: convertArrayToHashMapByKey(
            investorDtoList.map((invDto) => invDto.toInvestor()),
            'hash'
        )
    }
}

const aggregatePoolsForStore = (data) => {
    const poolDtoList = data.map((ssPool) => new PoolDto(ssPool))

    return {
        poolStorePools: poolDtoList.map((poolDto) => poolDto.toName()),
        pools: convertArrayToHashMapByKey(
            poolDtoList.map((poolDto) => poolDto.toPool()),
            'name'
        )
    }
}

const aggregateSwapsForStore = (data, respData) => {
    const poolNamesById = createHashMappings(respData.pool, 'id', 'name')
    const invHashById = createHashMappings(respData.investor, 'id', 'hash')

    return data.map((ssSwap) =>
        new SwapDto(ssSwap, poolNamesById, invHashById).toObj()
    )
}

const aggregateLogsForStore = (data) => {
    const logObjList = data.map((ssLog) => new LogDto(ssLog).toObj())

    return {
        logs: logObjList
    }
}

const aggregateQuestsForStore = (data) => {
    const questDtoList = data.map((ssQuest) => new QuestDto(ssQuest))

    return {
        questStore: {
            quests: questDtoList
                .filter((questDto) => questDto.name !== 'USDC')
                .map((questDto) => questDto.toName()),
            humanQuests: questDtoList
                .filter((questDto) => questDto.is_human)
                .map((questDto) => questDto.toName())
        },
        quests: convertArrayToHashMapByKey(
            questDtoList.map((questDto) => questDto.toQuest()),
            'name'
        )
    }
}

const extractTotalSwapsAndLogs = (data) => {
    return data.reduce(
        (sum, current) => {
            return {
                totalSwaps: [...sum.totalSwaps, ...current.swap],
                totalLogs: [...sum.totalLogs, ...current.log]
            }
        },
        { totalSwaps: [], totalLogs: [] }
    )
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
            active: 'AGORA' /* active pool*/,
            swapMode: 'smart'
        },
        pools: new HashMap(),
        questStore: {
            quests: [],
            humanQuests: [],
            selectedQuests: [],
            active: '',
            proMode: false
        },
        quests: new HashMap(),
        /* not ready yet */
        dayTrackerStore: { currentDay: 0 },
        moneyDist: {
            citing: [],
            buying: [],
            selling: [],
            buyingSmart: [],
            sellingSmart: []
        }
    }

    newState.dayTrackerStore.currentDay = data.current_day
    newState.generatorStore = transformScenario(data.scenario)

    const { investors, investorStoreInvestors } = aggregateInvestorsForStore(
        data.investor
    )
    newState.investorStore.investors = investorStoreInvestors
    newState.investors = investors

    const { pools, poolStorePools } = aggregatePoolsForStore(data.pool)
    newState.poolStore.pools = poolStorePools
    newState.pools = pools

    const { quests, questStore } = aggregateQuestsForStore(data.quest)
    newState.questStore.quests = questStore.quests
    newState.questStore.humanQuests = questStore.humanQuests
    newState.quests = quests

    const { totalSwaps, totalLogs } = extractTotalSwapsAndLogs(data.pool)

    newState.poolStore.swaps = aggregateSwapsForStore(totalSwaps, data)

    const { logs } = aggregateLogsForStore(totalLogs)
    newState.logStore.logObjs = logs

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
