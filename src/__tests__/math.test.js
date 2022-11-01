import { faker } from '@faker-js/faker'
import sha256 from 'crypto-js/sha256'
import HashMap from 'hashmap'

import Investor from '../logic/Investor/Investor.class'
import UsdcToken from '../logic/Quest/UsdcToken.class'
import Router from '../logic/Router/Router.class'
import { pp2p } from '../logic/Utils/logicUtils'
import globalConfig from '../logic/config.global.json'
import { getCP, getQP } from './helpers/getQuestPools'

describe.skip('Uniswap Math formulas', () => {
    it('constant product value is maintained when trading', () => {
        const x = 2000
        const y = 300
        const k1 = x * y

        const dx = 500
        const dy = (y * dx) / (x + dx)
        const k2 = (x + dx) * (y - dy)

        expect(k1).toBe(k2)
    })

    it('K is higher when new liquidity added', () => {
        const x = 5000
        const y = 200
        const k = x * y

        const dx = 500
        const dy = 20

        const k2 = (x + dx) * (y * dy)

        expect(k2).toBeGreaterThan(k)
    })

    it('What is dy for dx?', () => {
        const x = 5000
        const y = 200

        const dx = 500
        const dy = (y * dx) / x

        expect(dy).toBe(20)
    })

    it('Existing price is equal to the new to be added liquidity size', () => {
        const x = 5000
        const y = 200

        const dx = 246
        const dy = (y * dx) / x

        expect(dx / dy).toBe(x / y)
    })

    it("price doesn't change when new liquidity added", () => {
        const x = 1000
        const y = 250

        const dx = 100
        const dy = (y * dx) / x

        const p = x / y
        const px = (x + dx) / (y + dy)

        expect(p).toEqual(px)
    })

    it('calculate L of x', () => {
        const x = 5000
        const Pa = 1
        const Pb = 10000
        const Lx =
            x *
            ((Math.sqrt(Pa) * Math.sqrt(Pb)) / (Math.sqrt(Pb) - Math.sqrt(Pa)))

        expect(Lx).toBeCloseTo(5050.505)
    })

    it('calculate L of y', () => {
        const y = 5000
        const Pa = 1
        const Pb = 10000
        const Ly = y / (Math.sqrt(Pb) - Math.sqrt(Pa))

        expect(Ly).toBeCloseTo(50.505)
    })

    it('calculate L of x and y', () => {
        const x = 5000
        const y = 5000
        const Px = 1
        const Py = 10000
        const Pa = 1
        const Pb = 10000

        const Lx =
            x *
            ((Math.sqrt(Px) * Math.sqrt(Pb)) / (Math.sqrt(Pb) - Math.sqrt(Px)))
        const Ly = y / (Math.sqrt(Py) - Math.sqrt(Pa))

        expect(Lx).toBeCloseTo(5050.505)
        expect(Ly).toBeCloseTo(50.505)
    })

    it('calculate liquidity current-implementation', () => {
        const amount0 = 0
        const amount1 = 5000
        const P = 1
        const Pa = 1
        const Pb = 10000
        const liquidity0 = amount1 / (1 / Math.sqrt(Pa) - 1 / Math.sqrt(Pb))
        const liquidity1 = amount0 / (Math.sqrt(P) - Math.sqrt(Pa))

        expect(liquidity0).toBeCloseTo(5050.505)
        expect(liquidity1).toBe(NaN)
    })
})

describe('Basic math works', () => {
    let quests
    let pools

    beforeEach(() => {
        quests = new HashMap()
        pools = new HashMap()
    })

    it('Buys out the entire quest  pool without triggering surplus function', () => {
        const { pool } = getQP('AGORA', 1000000)

        const res = pool.buy(1000000000)
        expect(res[0]).toBeCloseTo(-133426696.95, 2)
        expect(res[1]).toBe(20000)
    })

    it('Sells out the entire quest  pool without triggering surplus function', () => {
        const { pool } = getQP('AGORA', 1000000)

        pool.buy(1000000000)
        const res = pool.sell(1000000000)
        expect(res[0]).toBeCloseTo(-20000)
        expect(res[1]).toBeCloseTo(133426696.95, 2)
    })

    it('Buys out the entire quest pool without triggering surplus function via smart route', () => {
        const { quest, pool } = getQP('AGORA')

        quests.set(quest.name, quest)
        quests.set('USDC', new UsdcToken())

        pools.set(pool.name, pool)

        const router = new Router(quests, pools)
        const res = router.smartSwap('USDC', 'AGORA', 1000000000)

        expect(res[0]).toBeCloseTo(-13342669.695, 3)
        expect(res[1]).toBeCloseTo(20000)
    })

    it('Sells out the entire quest pool without triggering surplus function via smart route', () => {
        const { quest, pool } = getQP('AGORA')

        quests.set(quest.name, quest)
        quests.set('USDC', new UsdcToken())

        pools.set(pool.name, pool)

        const router = new Router(quests, pools)

        router.smartSwap('USDC', 'AGORA', 1000000000)
        const res = router.smartSwap('AGORA', 'USDC', 1000000000)

        expect(res[0]).toBeCloseTo(-20000, 0)
        expect(res[1]).toBeCloseTo(13342669.695, 3)
    })

    it('Buys out the entire cross pool with 1:1 price', () => {
        const { quest: qAGORA, pool: AGORA } = getQP('AGORA')
        const { quest: qTEST, pool: TEST } = getQP('TEST')

        const { crossPool: AGORA_TEST } = getCP(
            qTEST,
            qAGORA,
            TEST,
            AGORA,
            0,
            50.5
        )

        const res = AGORA_TEST.buy(1000)
        expect(res[0]).toBeCloseTo(-71.417, 2)
        expect(res[1]).toBeCloseTo(50.5, 1)
    })

    it('Sells out the entire cross pool with 1:1 price', () => {
        const { quest: qAGORA, pool: AGORA } = getQP('AGORA')
        const { quest: qTEST, pool: TEST } = getQP('TEST')

        const { crossPool: AGORA_TEST } = getCP(
            qTEST,
            qAGORA,
            TEST,
            AGORA,
            0,
            50.5
        )

        AGORA_TEST.buy(1000)
        const res = AGORA_TEST.sell(1000)
        expect(res[0]).toBeCloseTo(-50.5, 1)
        expect(res[1]).toBeCloseTo(71.417, 2)
    })

    it('Doesnt buy anything at the end of the quest pool', () => {})
    it('Doesnt buy anything at the end of the cross pool with price 1:1 pool', () => {})
    it('Doesnt buy anything at the end of the cross pool with cited higher than citing pool', () => {})
    it('Doesnt buy anything at the end of the cross pool with citing higher than cited pool', () => {})

    it('Doesnt sell anything at the end of the quest pool', () => {})
    it('Doesnt sell anything at the end of the cross pool with price 1:1 pool', () => {})
    it('Doesnt sell anything at the end of the cross pool with cited higher than citing pool', () => {})
    it('Doesnt sell anything at the end of the cross pool with citing higher than cited pool', () => {})

    it('Doesnt buy anything at the end of the quest pool via smart route', () => {})
    it('Doesnt buy anything at the end of the cross pool with price 1:1 pool via smart route', () => {})
    it('Doesnt buy anything at the end of the cross pool with cited higher than citing pool via smart route', () => {})
    it('Doesnt buy anything at the end of the cross pool with citing higher than cited pool via smart route', () => {})

    it('Doesnt sell anything at the end of the quest pool via smart route', () => {})
    it('Doesnt sell anything at the end of the cross pool with price 1:1 pool via smart route', () => {})
    it('Doesnt sell anything at the end of the cross pool with cited higher than citing pool via smart route', () => {})
    it('Doesnt sell anything at the end of the cross pool with citing higher than cited pool via smart route', () => {})

    it('Buys out the entire cross pool with price 1:1 via smart route', () => {
        const { quest: qAGORA, pool: AGORA } = getQP('AGORA')
        const { quest: qTEST, pool: TEST } = getQP('TEST')

        const { crossPool: AGORA_TEST } = getCP(
            qTEST,
            qAGORA,
            TEST,
            AGORA,
            0,
            50.5
        )

        quests.set(qAGORA.name, qAGORA)
        quests.set(qTEST.name, qTEST)
        quests.set('USDC', new UsdcToken())

        pools.set(AGORA.name, AGORA)
        pools.set(TEST.name, TEST)
        pools.set(AGORA_TEST.name, AGORA_TEST)

        const router = new Router(quests, pools)

        const res = router.smartSwap('AGORA', 'TEST', 1000)
        expect(res[0]).toBeCloseTo(-71.417, 2)
        expect(res[1]).toBeCloseTo(50.5, 1)
    })

    fit('Sells out the entire cross pool with price 1:1 via smart route', () => {
        // Assume path: USDC-Praseodymium (5)-AGORA-Praseodymium (3)
        const { quest: qPRA3, pool: PRA3 } = getQP('TEST_1', 1000000)
        const { quest: qPRA5, pool: PRA5 } = getQP('TEST_2', 1000000)
        const { quest: qAGORA, pool: AGORA } = getQP('AGORA', 1000000)

        AGORA.buy(25000)

        AGORA.buy(555555)
        PRA3.buy(1480)
        PRA5.buy(5000)
        PRA5.buy(650)

        const { crossPool: AGORA_PRA3 } = getCP(
            qPRA3,
            qAGORA,
            PRA3,
            AGORA,
            0,
            50.025
        )
        const { crossPool: AGORA_PRA5 } = getCP(
            qPRA5,
            qAGORA,
            PRA5,
            AGORA,
            0,
            50.025
        )

        globalConfig.JOURNAL = true
        globalConfig.JOURNAL_BUY = true
        globalConfig.JOURNAL_SELL = true

        console.log(
            AGORA_PRA3.name,
            AGORA_PRA3.curPrice,
            pp2p(AGORA_PRA3.curPP),
            AGORA_PRA3.volumeToken0,
            AGORA_PRA3.volumeToken1
        )
        console.log(AGORA_PRA3)
        // @TODO: If this returns anything higher than [0,0] -> this is the BUG
        // Comment out Pool.setActiveLiq function to reproduce
        console.log(AGORA_PRA3.sell(100))
        console.log(AGORA_PRA3.buy(100))
        // @TODO: Vitaliy do investor.citeQuest here again on AGORA_PRA3
        //console.log(AGORA_PRA3.sell(100))
        console.log(AGORA_PRA3)
        console.log(
            AGORA_PRA3.name,
            AGORA_PRA3.curPrice,
            AGORA_PRA3.volumeToken0,
            AGORA_PRA3.volumeToken1
        )

        globalConfig.JOURNAL = false
        globalConfig.JOURNAL_BUY = true
        globalConfig.JOURNAL_SELL = true

        const pools = new HashMap()
        const quests = new HashMap()
        pools.set(AGORA.name, AGORA)
        pools.set(PRA3.name, PRA3)
        pools.set(PRA5.name, PRA5)
        pools.set(AGORA_PRA3.name, AGORA_PRA3)
        pools.set(AGORA_PRA5.name, AGORA_PRA5)

        quests.set(qPRA3.name, qPRA3)
        quests.set(qAGORA.name, qAGORA)
        quests.set(qPRA5.name, qPRA5)
        quests.set('USDC', new UsdcToken())

        const router = new Router(quests, pools)

        //console.log(router.smartSwap('USDC', 'Praseodymium (5)', 2000))
    })

    fit('After opening a position on drained cross pool it opens with correct price range', () => {})

    it('When selling out drained pool it correctly sets active position', () => {
        expect(0).toBe(1)
    })

    it('Left position - When opening a new position with lower priceMin than curPrice and price shift is free - do the change to another active liquidity', () => {
        expect(0).toBe(1)
    })

    it('Right position - When opening a new position with lower priceMin than curPrice and price shift is free - do the change to another active liquidity', () => {
        expect(0).toBe(1)
    })

    it('Never sells tokens that do not exist in the pool', () => {
        expect(0).toBe(1)
    })

    it('Never consumes more than it can exchange for during swap', () => {
        expect(0).toBe(1)
    })

    it('Properly exists when 0 is passed to buy/sell', () => {
        expect(0).toBe(1)
    })

    it('Properly exists when NaN is passed to buy/sell', () => {
        expect(0).toBe(1)
    })

    it('Properly exists when during buy/sell calculation it got to NaN', () => {
        expect(0).toBe(1)
    })
})
