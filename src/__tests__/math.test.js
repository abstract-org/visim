import { faker } from '@faker-js/faker'
import sha256 from 'crypto-js/sha256'
import HashMap from 'hashmap'

import Investor from '../logic/Investor/Investor.class'
import UsdcToken from '../logic/Quest/UsdcToken.class'
import Router from '../logic/Router/Router.class'

describe('Uniswap Math formulas', () => {
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

describe('Liquidity Calculations', () => {
    const investor = Investor.create('INV', 'INV', 10000)

    const amtNextBuy = (curLiq, sqrtPrice, arrivedSqrtPrice) => {
        let amt0 = curLiq * (arrivedSqrtPrice - sqrtPrice)
        let amt1 = curLiq * (1 / arrivedSqrtPrice - 1 / sqrtPrice)

        return [amt0, amt1]
    }

    const amtNextSell = (curLiq, sqrtPrice, arrivedSqrtPrice) => {
        let amt0 = curLiq * (1 / sqrtPrice - 1 / arrivedSqrtPrice)
        let amt1 = curLiq * (sqrtPrice - arrivedSqrtPrice)

        return [amt0, amt1]
    }

    const getQP = (name) => {
        const quest = investor.createQuest(name)
        const pool = quest.createPool({
            tokenLeft: new UsdcToken(),
            initialPositions: [
                { priceMin: 1, priceMax: 10000, tokenA: 0, tokenB: 5000 },
                { priceMin: 20, priceMax: 10000, tokenA: 0, tokenB: 5000 },
                { priceMin: 50, priceMax: 10000, tokenA: 0, tokenB: 5000 },
                {
                    priceMin: 200,
                    priceMax: 10000,
                    tokenA: 0,
                    tokenB: 5000
                }
            ]
        })

        return { quest, pool }
    }

    const maxOneShotIn = (p) => {
        return p.curLiq * (Math.sqrt(2 ** p.curRight) - Math.sqrt(p.curPrice))
    }

    const maxOneShotOut = (p) => {
        return (
            p.curLiq *
            (1 / Math.sqrt(2 ** p.curRight) - 1 / Math.sqrt(p.curPrice))
        )
    }

    const getCP = (qA, qB, A, B) => {
        const AB = investor.createPool(qB, qA)
        qA.addPool(AB)
        qB.addPool(AB)

        const priceRange = investor.calculatePriceRange(AB, B, A, 2)
        investor.citeQuest(AB, priceRange.min, priceRange.max, 0, 1000)

        return { crossPool: AB }
    }

    const { quest: questA, pool: A } = getQP('A')
    const { quest: questB, pool: B } = getQP('B')
    const { quest: questC, pool: C } = getQP('C')

    A.buy(1000)
    B.buy(6000)
    C.buy(2500)

    const { crossPool: AB } = getCP(questA, questB, A, B)
    const { crossPool: BC } = getCP(questB, questC, B, C)

    const pools = new HashMap()
    const quests = new HashMap()

    pools.set(A.name, A)
    pools.set(B.name, B)
    pools.set(C.name, C)
    pools.set(AB.name, AB)
    pools.set(BC.name, BC)

    quests.set(questA.name, questA)
    quests.set(questB.name, questB)
    quests.set(questC.name, questC)

    const router = new Router(quests, pools)
    fit('calculates amount until next price point', () => {
        const maxAB_in_B = maxOneShotIn(AB)
        const maxAB_out_A = maxOneShotOut(AB)

        const maxBC_in_C = maxOneShotIn(BC)
        const maxBC_out_B = maxOneShotOut(BC)

        console.log('should give', maxAB_in_B, maxAB_out_A)
        console.log('should give', maxBC_in_C, maxBC_out_B)

        const result_ABC_amtout_A =
            ((AB.liq * (1 / Math.sqrt(AB.curPrice) - AB.liq / maxBC_out_B)) /
                AB.liq) *
            (1 / Math.sqrt(AB.curPrice) -
                AB.liq /
                    (BC.liq *
                        (1 / Math.sqrt(BC.curPrice) -
                            1 / Math.sqrt(2 ** BC.curRight))))

        console.log(result_ABC_amtout_A)
    })
})
