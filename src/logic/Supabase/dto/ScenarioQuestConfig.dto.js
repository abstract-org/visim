export class ScenarioQuestConfigDto {
    constructor(questConfig, scenarioId) {
        this.scenario_id = scenarioId
        this.quest_gen_alias = questConfig.questGenAlias
        this.quest_gen_name = questConfig.questGenName
        this.initial_author_invest = questConfig.initialAuthorInvest
        this.starting_price = questConfig.startingPrice
        this.cite_single_name = questConfig.citeSingleName
        this.prob_cite_single = questConfig.probCiteSingle
        this.single_cite_perc = questConfig.singleCitePerc
        this.cite_single_multiplier = questConfig.citeSingleMultiplier
        this.prob_random_cite = questConfig.probRandomCite
        this.random_cite_perc = questConfig.randomCitePerc
        this.cite_random_multiplier = questConfig.citeRandomMultiplier
        this.cite_random_prefer_own = questConfig.citeRandomPreferOwn
    }
}
