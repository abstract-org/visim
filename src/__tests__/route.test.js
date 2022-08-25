import HashMap from 'hashmap'
import Investor from '../logic/Investor/Investor.class'
import Router from '../logic/Router/Router.class'
import globalConfig from '../logic/config.global.json'
import { faker } from '@faker-js/faker'
import { prepareCrossPools } from './helpers/poolManager'

let globalState = {
    pools: new HashMap(),
    investors: new HashMap(),
    quests: new HashMap()
}

afterAll(() => {
    globalState = {
        pools: new HashMap(),
        investors: new HashMap(),
        quests: new HashMap()
    }
})

/**
 * Planned test
 * [USDC, A], [USDC, B], [USDC, C], [USDC, D], [USDC, E]
 * Citation
 * [A,B], [B,C], [D,C], [A,D], [E,D]
 */
fit('Calculates optimal route to spend A for D', () => {
    const router = new Router(globalState)
    const mockInvestor1 = new Investor(1, 50000, 'long-term')

    const amount = 10
    const priceMin = 1
    const priceMax = 10
    const defaultTokenASum = 1000

    const [quests, pools] = prepareCrossPools(
        priceMin,
        priceMax,
        defaultTokenASum
    )

    for (const pool of Object.keys(pools)) {
        globalState.pools.set(pools[pool].name, pools[pool])
    }

    for (const quest of quests) {
        globalState.quests.set(quest.name, quest)
    }

    // Deposit USDC in all USDC pools
    const [usdcAIn, aOut] = pools.poolA.buy(500) // Buy Token A for 500 USDC
    mockInvestor1.addBalance(pools.poolA.tokenLeft.name, usdcAIn)
    mockInvestor1.addBalance(pools.poolA.tokenRight.name, aOut)

    const [usdcBIn, bOut] = pools.poolB.buy(1000) // Buy Token B for 1000 USDC
    mockInvestor1.addBalance(pools.poolB.tokenLeft.name, usdcBIn)
    mockInvestor1.addBalance(pools.poolB.tokenRight.name, bOut)

    const [usdcCIn, cOut] = pools.poolC.buy(1500) // Buy Token C for 1500 USDC
    mockInvestor1.addBalance(pools.poolC.tokenLeft.name, usdcCIn)
    mockInvestor1.addBalance(pools.poolC.tokenRight.name, cOut)

    const [usdcDIn, dOut] = pools.poolD.buy(5000) // Buy Token D for 5000 USDC
    mockInvestor1.addBalance(pools.poolD.tokenLeft.name, usdcDIn)
    mockInvestor1.addBalance(pools.poolD.tokenRight.name, dOut)

    const [usdcEIn, eOut] = pools.poolE.buy(10000) // Buy Token E for 10000 USDC
    mockInvestor1.addBalance(pools.poolE.tokenLeft.name, usdcEIn)
    mockInvestor1.addBalance(pools.poolE.tokenRight.name, eOut)

    pools.poolE.getSwapInfo()
    pools.poolE.sell(500)
    pools.poolE.getSwapInfo()

    // Deposit Tokens in Cross Pools
    const [abIn, abOut] = pools.AB.buy(200) //  Has X A - Buy A by depositing B
    mockInvestor1.addBalance(pools.AB.tokenLeft.name, abIn)
    mockInvestor1.addBalance(pools.AB.tokenRight.name, abOut)

    const [caIn, caOut] = pools.CA.buy(410) /// Has X C - Buy C by depositing A
    mockInvestor1.addBalance(pools.CA.tokenLeft.name, caIn)
    mockInvestor1.addBalance(pools.CA.tokenRight.name, caOut)

    const [cbIn, cbOut] = pools.CB.buy(320) // Has X C - Buy C by depositing B
    mockInvestor1.addBalance(pools.CB.tokenLeft.name, cbIn)
    mockInvestor1.addBalance(pools.CB.tokenRight.name, cbOut)

    const [ceIn, ceOut] = pools.CE.buy(1) ///  Has X D - Buy D by depositing C
    mockInvestor1.addBalance(pools.CE.tokenLeft.name, ceIn)
    mockInvestor1.addBalance(pools.CE.tokenRight.name, ceOut)

    const [adIn, adOut] = pools.AD.buy(130) // Has X A - Buy A by depositing D
    mockInvestor1.addBalance(pools.AD.tokenLeft.name, adIn)
    mockInvestor1.addBalance(pools.AD.tokenRight.name, adOut)

    const [dcIn, dcOut] = pools.DC.buy(90) // Has X D - Buy D by depositing C
    mockInvestor1.addBalance(pools.DC.tokenLeft.name, dcIn)
    mockInvestor1.addBalance(pools.DC.tokenRight.name, dcOut)

    const [deIn, deOut] = pools.DE.buy(250) // Has X D - Buy D by depositing E
    mockInvestor1.addBalance(pools.DE.tokenLeft.name, deIn)
    mockInvestor1.addBalance(pools.DE.tokenRight.name, deOut)

    const [ebIn, ebOut] = pools.EB.buy(98) /// Has X E - Buy E by depositing B
    mockInvestor1.addBalance(pools.EB.tokenLeft.name, ebIn)
    mockInvestor1.addBalance(pools.EB.tokenRight.name, ebOut)

    // Buying D by spending A
    // [A,D], [C,A->D,C], [A,B->E,B->DE], [A,B->C,B->C,E->D,E]

    //const swaps = router.drySwapForPaths('AGORA_A', amount)
    // const swaps = router.drySwapAllForToken('AGORA_A', amount)

    // const graph = router.orderFor('AGORA_A', 'AGORA_D', swaps)
    // console.log(graph)
    // graph.print()
})
