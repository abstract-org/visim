import { plainToInstance } from 'class-transformer'

import { SupabaseClient, TABLE } from './SupabaseClient'
import { ScenarioInvestorConfigDto } from './dto/ScenarioInvestorConfig.dto'
import { ScenarioQuestConfigDto } from './dto/ScenarioQuestConfig.dto'
import { SnapshotWithTotalsDto } from './dto/Snapshot.dto'
import { toCamelCase } from "../Utils/logicUtils";

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

/**
 *
 * @param name
 * @param {Array} scenario_investor_config
 * @param {Array} scenario_quest_config
 * @returns {{questConfigs: *[], invConfigs: *[]}}
 */
export const aggregateGeneratorStore = ({
    name,
    scenario_investor_config,
    scenario_quest_config
}) => {
    return {
        invConfigs: scenario_investor_config.map((config) => toCamelCase(config)),
        questConfigs: scenario_quest_config.map((config) => toCamelCase(config))
    }
}

export const aggregateDayTrackerStore = () => {
    return {
        currentDay: 0
    }
}

export const aggregateQuestStore = () => {

    return {
        active: null,
        humanQuests: [],
        proMode: false,
        quests: [],
        selectedQuests: []
    }
}

export const aggregateInvestorStore = (investors) => {
    return {
        investors: investors.map(investor => investor.hash),
        active: investors[0].hash
    }
}

export const aggregatePoolStore = (pools) => {
    const poolNames = pools.map(pool => pool.name)
    const allSwaps = pools.reduce((sum, current) => {
        return [...sum, ...current.swap]
    }, [])
    return {
        active: poolNames[0],
        pools: poolNames,
        swapMode: 'smart',
        swaps: allSwaps
    }
}

export const aggregateLogStore = (logs) => {

    return {
        logObjs: []
    }
}

export const fetchSnapshotWithDataById = async (snapshotId) => {
    try {
        const { data, error } = await SupabaseClient.from(TABLE.snapshot)
            .select(
                `
            id,
            seed,
            created_at,
            ${TABLE.scenario} (
                name,
                ${TABLE.scenario_investor_config} (
                    *
                ),
                ${TABLE.scenario_quest_config} (
                    *
                )
            ),
            ${TABLE.investor} (
                id,
                name,
                type,
                hash
            ),
            ${TABLE.pool} (
                id,
                name,
                token0 (
                    *
                ),
                token1 (
                    *
                ),
                type,
                hash,
                ${TABLE.log} (
                    *
                ),
                ${TABLE.swap} (
                    id,
                    action,
                    amount_in,
                    amount_out,
                    day,
                    block,
                    path
                ),
                ${TABLE.position} (
                    liquidity,
                    left_point,
                    right_point,
                    price_point
                ),
                ${TABLE.position_owner} (
                    hash,
                    type,
                    amt0,
                    amt1,
                    pmin,
                    pmax,
                    native
                )
            ),
            ${TABLE.quest} (
                name
            )
          `
            )
            .eq('id', snapshotId)
            .single()

        if (error) {
            return null
        }

        return {
            generatorStore: aggregateGeneratorStore(data.scenario),
            investorStore: aggregateInvestorStore(data.investor),
            dayTrackerStore: aggregateDayTrackerStore(),
            questStore: aggregateQuestStore(data.quest),
            poolStore: aggregatePoolStore(data.pool),
            logStore: aggregateLogStore(data.log)
        }
    } catch (e) {}
}
