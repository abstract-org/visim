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

    describe('Liquidity Calculations', () => {
        const amtNextBuy = (curLiq, sqrtPrice, arrivedSqrtPrice) => {
            // Amount0 (curLiq * (arrivedSqrtPrice - sqrtPrice)
            let amt0 = curLiq * (arrivedSqrtPrice - sqrtPrice)
            // Amount1 (curLiq * (1/arrivedSqrtPrice - 1/sqrtPrice))
            let amt1 = curLiq * (1 / arrivedSqrtPrice - 1 / sqrtPrice)

            return [amt0, amt1]
        }

        const amtNextSell = (curLiq, sqrtPrice, arrivedSqrtPrice) => {
            let amt0 = curLiq * (1 / sqrtPrice - 1 / arrivedSqrtPrice)
            let amt1 = curLiq * (sqrtPrice - arrivedSqrtPrice)

            return [amt0, amt1]
        }

        const nextPrice = (sqrtPrice, amt, curLiq) => {
            return (sqrtPrice += amt / curLiq)
        }

        const investor = Investor.create('INV', 'INV', 10000)
        const quest = investor.createQuest('QUEST')
        const poolA = quest.createPool({
            tokenLeft: new UsdcToken(),
            initialPositions: [
                { priceMin: 1, priceMax: 10000, tokenA: 0, tokenB: 5000 }
            ]
        })

        const questB = investor.createQuest('QUEST_B')
        const poolB = questB.createPool({
            tokenLeft: new UsdcToken(),
            initialPositions: [
                { priceMin: 1, priceMax: 10000, tokenA: 0, tokenB: 5000 }
            ]
        })

        poolA.buy(1000)
        poolB.buy(6000)
        const startingPrice = poolA.curPrice / poolB.curPrice
        const crossPool = investor.createPool(questB, quest, startingPrice)
        quest.addPool(crossPool)
        questB.addPool(crossPool)

        const priceRange = investor.calculatePriceRange(
            crossPool,
            poolB,
            poolA,
            3
        )
        investor.citeQuest(crossPool, priceRange.min, priceRange.max, 0, 2000)

        const pools = new HashMap()
        const quests = new HashMap()

        pools.set(poolA.name, poolA)
        pools.set(poolB.name, poolB)
        pools.set(crossPool.name, crossPool)

        quests.set(quest.name, quest)
        quests.set(questB.name, questB)

        const router = new Router(quests, pools)

        /**
         * For amt0 
            how much amt1 I get
            with liq X
            in path A
         */
        it('calculates amount until next price point', () => {
            const inOut = poolA.dryBuy(1)

            const curLiq = poolA.curLiq
            const totalLiq = poolA.pos
                .values()
                .reduce((prev, po) => prev + po.liquidity, 0)

            const amt = 2500
            const inOutRate = Math.abs(inOut[1]) / Math.abs(inOut[0])
            const sqrtPrice = Math.sqrt(1)
            const arrivedSqrtPrice = nextPrice(sqrtPrice, amt, curLiq)

            //const paths = router.calculatePairPaths(questB.name, quest.name)
            //console.log(router.drySwapForPricedPaths(paths))

            //console.log(router.smartSwap(questB.name, quest.name, 2500))

            // console.log(
            //     'liqs',
            //     curLiq,
            //     totalLiq,
            //     'sqrt_prices',
            //     sqrtPrice,
            //     arrivedSqrtPrice,
            //     'new price',
            //     arrivedSqrtPrice ** 2,
            //     'in/out',
            //     inOutRate,
            //     inOut
            // )

            //console.log(amtNextBuy(curLiq, sqrtPrice, arrivedSqrtPrice))
            //console.log(amtNextSell(curLiq, sqrtPrice, arrivedSqrtPrice))

            //console.log(amtNextBuy(curLiq, sqrtPrice, Math.sqrt(4)))
            //console.log(amtNextSell(curLiq, sqrtPrice, Math.sqrt(4)))
        })
    })
})
