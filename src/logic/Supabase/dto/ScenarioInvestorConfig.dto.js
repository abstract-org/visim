export class ScenarioInvestorConfigDto {
    scenario_id
    global_swap_threshold
    daily_spawn_probability
    inv_gen_alias
    inv_gen_name
    initial_balance
    buy_sell_period_days
    buy_single_perc
    include_single_name
    buy_sum_perc
    buy_quest_perc
    buy_gainer_perc
    buy_gainers_frequency
    exclude_single_name
    swap_inc_frequency
    swap_inc_dir
    swap_inc_sum_perc
    swap_inc_by_perc
    swap_dec_frequency
    swap_dec_dir
    swap_dec_sum_perc
    swap_dec_by_perc
    create_quest
    keep_creating_quests
    keep_creating_period_days
    keep_citing_probability
    keep_citing_sum_percentage
    keep_citing_price_higher_than
    keep_citing_pos_multiplier
    value_sell_period_days
    value_sell_amount
    smart_route_depth
    
    constructor(data) {
        this.scenario_id = data.scenarioId
        this.global_swap_threshold = data.globalSwapThreshold
        this.daily_spawn_probability = data.dailySpawnProbability
        this.inv_gen_alias = data.invGenAlias
        this.inv_gen_name = data.invGenName
        this.initial_balance = data.initialBalance
        this.buy_sell_period_days = data.buySellPeriodDays
        this.buy_single_perc = data.buySinglePerc
        this.include_single_name = data.includeSingleName
        this.buy_sum_perc = data.buySumPerc
        this.buy_quest_perc = data.buyQuestPerc
        this.buy_gainer_perc = data.buyGainerPerc
        this.buy_gainers_frequency = data.buyGainersFrequency
        this.exclude_single_name = data.excludeSingleName
        this.swap_inc_frequency = data.swapIncFrequency
        this.swap_inc_dir = data.swapIncDir
        this.swap_inc_sum_perc = data.swapIncSumPerc
        this.swap_inc_by_perc = data.swapIncByPerc
        this.swap_dec_frequency = data.swapDecFrequency
        this.swap_dec_dir = data.swapDecDir
        this.swap_dec_sum_perc = data.swapDecSumPerc
        this.swap_dec_by_perc = data.swapDecByPerc
        this.create_quest = data.createQuest
        this.keep_creating_quests = data.keepCreatingQuests
        this.keep_creating_period_days = data.keepCreatingPeriodDays
        this.keep_citing_probability = data.keepCitingProbability
        this.keep_citing_sum_percentage = data.keepCitingSumPercentage
        this.keep_citing_price_higher_than =
            data.keepCitingPriceHigherThan
        this.keep_citing_pos_multiplier = data.keepCitingPosMultiplier
        this.value_sell_period_days = data.valueSellPeriodDays
        this.value_sell_amount = data.valueSellAmount
        this.smart_route_depth = data.smartRouteDepth
    }
}
