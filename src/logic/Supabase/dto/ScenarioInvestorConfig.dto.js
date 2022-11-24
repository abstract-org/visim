export class ScenarioInvestorConfigDto {
    constructor(investorConfig, scenarioId) {
        this.scenario_id = scenarioId
        this.global_swap_threshold = 0
        this.daily_spawn_probability = investorConfig.dailySpawnProbability
        this.inv_gen_alias = investorConfig.invGenAlias
        this.inv_gen_name = investorConfig.invGenName
        this.initial_balance = investorConfig.initialBalance
        this.buy_sell_period_days = investorConfig.buySellPeriodDays
        this.buy_single_perc = investorConfig.buySinglePerc
        this.include_single_name = investorConfig.includeSingleName
        this.buy_sum_perc = investorConfig.buySumPerc
        this.buy_quest_perc = investorConfig.buyQuestPerc
        this.buy_gainer_perc = investorConfig.buyGainerPerc
        this.buy_gainers_frequency = investorConfig.buyGainersFrequency
        this.exclude_single_name = investorConfig.excludeSingleName
        this.swap_inc_frequency = investorConfig.swapIncFrequency
        this.swap_inc_dir = investorConfig.swapIncDir
        this.swap_inc_sum_perc = investorConfig.swapIncSumPerc
        this.swap_inc_by_perc = investorConfig.swapIncByPerc
        this.swap_dec_frequency = investorConfig.swapDecFrequency
        this.swap_dec_dir = investorConfig.swapDecDir
        this.swap_dec_sum_perc = investorConfig.swapDecSumPerc
        this.swap_dec_by_perc = investorConfig.swapDecByPerc
        this.create_quest = investorConfig.createQuest
        this.keep_creating_quests = investorConfig.keepCreatingQuests
        this.keep_creating_period_days = investorConfig.keepCreatingPeriodDays
        this.keep_citing_probability = investorConfig.keepCitingProbability
        this.keep_citing_sum_percentage = investorConfig.keepCitingSumPercentage
        this.keep_citing_price_higher_than =
            investorConfig.keepCitingPriceHigherThan
        this.keep_citing_pos_multiplier = investorConfig.keepCitingPosMultiplier
        this.value_sell_period_days = investorConfig.valueSellPeriodDays
        this.value_sell_amount = investorConfig.valueSellAmount
        this.smart_route_depth = investorConfig.smartRouteDepth
    }
}
