import HashMap from 'hashmap'

import Router from '../logic/Router/Router.class'
import { getCP, getQP } from './helpers/getQuestPools'

describe('smartSwap()', () => {
    let quests = {}
    let pools = {}
    const shouldDebugRouter = false
    let token0
    let token1

    const objMapTo2dArray = (inpObj, mappingKey = 'name') =>
        Object.entries(inpObj).map(([, obj]) => [obj[mappingKey], obj])

    const createRouter = (questObj, poolsObj, isDbg = shouldDebugRouter) => {
        const poolsHashMap = new HashMap(objMapTo2dArray(poolsObj))
        const questsHashMap = new HashMap(objMapTo2dArray(questObj))

        return new Router(questsHashMap, poolsHashMap, isDbg)
    }

    describe('[A-B-C-D] buy-buy-buy', () => {
        beforeEach(() => {
            const { quest: questA, pool: poolA } = getQP('A', 1000000)
            const { quest: questB, pool: poolB } = getQP('B', 1000000)
            const { quest: questC, pool: poolC } = getQP('C', 1000000)
            const { quest: questD, pool: poolD } = getQP('D', 1000000)
            quests.A = questA
            quests.B = questB
            quests.C = questC
            quests.D = questD
            pools.A = poolA
            pools.B = poolB
            pools.C = poolC
            pools.D = poolD

            pools.AB = getCP(
                quests.B,
                quests.A,
                pools.B,
                pools.A,
                0,
                150
            ).crossPool
            pools.BC = getCP(
                quests.C,
                quests.B,
                pools.C,
                pools.B,
                0,
                75
            ).crossPool
            pools.CD = getCP(
                quests.D,
                quests.C,
                pools.D,
                pools.C,
                0,
                220
            ).crossPool

            token0 = quests.A.name
            token1 = quests.D.name
        })

        afterEach(() => {
            quests = {}
            pools = {}
        })

        it('tokenVolumes changes (amountIn > 1000)', () => {
            const volumeTokensBefore = Object.values(pools)
                .filter((p) => !p.isQuest())
                .map((p) => ({
                    name: p.name,
                    volumeToken0: p.volumeToken0,
                    volumeToken1: p.volumeToken1
                }))
            const router = createRouter(quests, pools, true)
            const amountIn = Math.round(Math.random() * 1000 + 1000)
            const result = router.smartSwap(token0, token1, amountIn)
            console.log('RESULT', result)
            const volumeTokensAfter = Object.values(pools)
                .filter((p) => !p.isQuest())
                .map((p) => ({
                    name: p.name,
                    volumeToken0: p.volumeToken0,
                    volumeToken1: p.volumeToken1
                }))

            expect(volumeTokensAfter).not.toEqual(
                expect.arrayContaining(volumeTokensBefore)
            )
            volumeTokensAfter.forEach((after) => {
                const before = volumeTokensBefore.find(
                    (poolBefore) => poolBefore === after.name
                )
                if (!before) return
                expect(after.volumeToken0).not.toEqual(before.volumeToken0)
                expect(after.volumeToken1).not.toEqual(before.volumeToken1)
            })
        })

        it('spent > 0 & received > 0 (amountIn > 1000)', () => {
            const router = createRouter(quests, pools, true)
            const amountIn = Math.ceil(Math.random() * 1)
            const result = router.smartSwap(token0, token1, amountIn)
            console.log(`amountIn: ${amountIn}\t\tRESULT ${result}`)
            const amountSpent = -result[0]
            const amountReceived = result[1]

            expect(amountSpent).toBeGreaterThanOrEqual(0)
            expect(amountReceived).toBeGreaterThanOrEqual(0)
        })

        it('spent ~== amountIn & received > 0 when amountIn < 100', () => {
            const router = createRouter(quests, pools, true)
            const amountIn = Math.ceil(Math.random() * 100)
            const result = router.smartSwap(token0, token1, amountIn)
            console.log(`amountIn: ${amountIn}\t\tRESULT ${result}`)
            const amountSpent = -result[0]
            const amountReceived = result[1]

            expect(amountSpent).toBeCloseTo(amountIn)
            expect(amountReceived).toBeGreaterThan(0)
        })
    })

    describe('[A-B-C-D] sell-buy-sell', () => {
        beforeEach(() => {
            const { quest: questA, pool: poolA } = getQP('A', 1000000)
            const { quest: questB, pool: poolB } = getQP('B', 1000000)
            const { quest: questC, pool: poolC } = getQP('C', 1000000)
            const { quest: questD, pool: poolD } = getQP('D', 1000000)
            quests.A = questA
            quests.B = questB
            quests.C = questC
            quests.D = questD
            pools.A = poolA
            pools.B = poolB
            pools.C = poolC
            pools.D = poolD

            pools.AB = getCP(
                quests.A,
                quests.B,
                pools.B,
                pools.A,
                150,
                0
            ).crossPool
            pools.BC = getCP(
                quests.C,
                quests.B,
                pools.C,
                pools.B,
                0,
                75
            ).crossPool
            pools.CD = getCP(
                quests.C,
                quests.D,
                pools.D,
                pools.C,
                220,
                0
            ).crossPool

            token0 = quests.A.name
            token1 = quests.D.name
        })

        afterEach(() => {
            quests = {}
            pools = {}
        })

        it('tokenVolumes changes (amountIn > 1000)', () => {
            const volumeTokensBefore = Object.values(pools)
                .filter((p) => !p.isQuest())
                .map((p) => ({
                    name: p.name,
                    volumeToken0: p.volumeToken0,
                    volumeToken1: p.volumeToken1
                }))
            const router = createRouter(quests, pools, true)
            const amountIn = Math.round(Math.random() * 1000 + 1000)
            const result = router.smartSwap(token0, token1, amountIn)
            console.log('RESULT', result)
            const volumeTokensAfter = Object.values(pools)
                .filter((p) => !p.isQuest())
                .map((p) => ({
                    name: p.name,
                    volumeToken0: p.volumeToken0,
                    volumeToken1: p.volumeToken1
                }))

            expect(volumeTokensAfter).not.toEqual(
                expect.arrayContaining(volumeTokensBefore)
            )
            volumeTokensAfter.forEach((after) => {
                const before = volumeTokensBefore.find(
                    (poolBefore) => poolBefore === after.name
                )
                if (!before) return
                expect(after.volumeToken0).not.toEqual(before.volumeToken0)
                expect(after.volumeToken1).not.toEqual(before.volumeToken1)
            })
        })

        it('spent > 0 & received > 0 (amountIn > 1000)', () => {
            const router = createRouter(quests, pools, true)
            const amountIn = Math.ceil(Math.random() * 1)
            const result = router.smartSwap(token0, token1, amountIn)
            console.log(`amountIn: ${amountIn}\t\tRESULT ${result}`)
            const amountSpent = -result[0]
            const amountReceived = result[1]

            expect(amountSpent).toBeGreaterThanOrEqual(0)
            expect(amountReceived).toBeGreaterThanOrEqual(0)
        })

        it('spent ~== amountIn & received > 0 when amountIn < 100', () => {
            const router = createRouter(quests, pools, true)
            const amountIn = Math.ceil(Math.random() * 100)
            const result = router.smartSwap(token0, token1, amountIn)
            console.log(`amountIn: ${amountIn}\t\tRESULT ${result}`)
            const amountSpent = -result[0]
            const amountReceived = result[1]

            expect(amountSpent).toBeCloseTo(amountIn)
            expect(amountReceived).toBeGreaterThan(0)
        })
    })

    describe('[A-B-C-D] buy-sell-buy', () => {
        beforeEach(() => {
            const { quest: questA, pool: poolA } = getQP('A', 1000000)
            const { quest: questB, pool: poolB } = getQP('B', 1000000)
            const { quest: questC, pool: poolC } = getQP('C', 1000000)
            const { quest: questD, pool: poolD } = getQP('D', 1000000)
            quests.A = questA
            quests.B = questB
            quests.C = questC
            quests.D = questD
            pools.A = poolA
            pools.B = poolB
            pools.C = poolC
            pools.D = poolD

            pools.AB = getCP(
                quests.B,
                quests.A,
                pools.B,
                pools.A,
                0,
                150
            ).crossPool
            pools.CB = getCP(
                quests.B,
                quests.C,
                pools.C, // ?????
                pools.B,
                75,
                0
            ).crossPool
            pools.CD = getCP(
                quests.D,
                quests.C,
                pools.D,
                pools.C,
                0,
                220
            ).crossPool

            token0 = quests.A.name
            token1 = quests.D.name
        })

        afterEach(() => {
            quests = {}
            pools = {}
        })

        it('tokenVolumes changes', () => {
            const volumeTokensBefore = Object.values(pools)
                .filter((p) => !p.isQuest())
                .map((p) => ({
                    name: p.name,
                    volumeToken0: p.volumeToken0,
                    volumeToken1: p.volumeToken1
                }))
            const router = createRouter(quests, pools, true)
            const token0 = quests.A.name
            const token1 = quests.D.name
            const amountIn = Math.round(Math.random() * 1000 + 1000)
            const result = router.smartSwap(token0, token1, amountIn)
            console.log('RESULT', result)
            const volumeTokensAfter = Object.values(pools)
                .filter((p) => !p.isQuest())
                .map((p) => ({
                    name: p.name,
                    volumeToken0: p.volumeToken0,
                    volumeToken1: p.volumeToken1
                }))

            expect(volumeTokensAfter).not.toEqual(
                expect.arrayContaining(volumeTokensBefore)
            )
            volumeTokensAfter.forEach((after) => {
                const before =
                    volumeTokensBefore.find(
                        (poolBefore) => poolBefore === after.name
                    ) || {}

                expect(after.volumeToken0).not.toEqual(before.volumeToken0)
                expect(after.volumeToken1).not.toEqual(before.volumeToken1)
            })
        })

        it('spent > 0 & received > 0 when amountIn > 1000', () => {
            const router = createRouter(quests, pools, true)
            const amountIn = Math.ceil(Math.random() * 1000 + 1000)
            const result = router.smartSwap(token0, token1, amountIn)
            console.log(`amountIn: ${amountIn}\t\tRESULT ${result}`)
            const amountSpent = -result[0]
            const amountReceived = result[1]

            expect(amountSpent).toBeGreaterThanOrEqual(0)
            expect(amountReceived).toBeGreaterThanOrEqual(0)
        })

        it('spent ~== amountIn & received > 0 when amountIn < 100', () => {
            const router = createRouter(quests, pools, true)
            const amountIn = Math.ceil(Math.random() * 100)
            const volumeToken1before = pools.CD.volumeToken1
            const result = router.smartSwap(token0, token1, amountIn)
            console.log(`amountIn: ${amountIn}\t\tRESULT ${result}`)
            const amountSpent = -result[0]
            const amountReceived = result[1]

            expect(amountSpent).toBeCloseTo(amountIn)
            expect(amountReceived).toBeLessThanOrEqual(volumeToken1before)
        })
    })

    describe('[A-B-C-D] ???', () => {
        beforeEach(() => {
            const { quest: questA, pool: poolA } = getQP('A', 1000000)
            const { quest: questB, pool: poolB } = getQP('B', 1000000)
            const { quest: questC, pool: poolC } = getQP('C', 1000000)
            const { quest: questD, pool: poolD } = getQP('D', 1000000)
            quests.A = questA
            quests.B = questB
            quests.C = questC
            quests.D = questD
            pools.A = poolA
            pools.B = poolB
            pools.C = poolC
            pools.D = poolD

            pools.AB = getCP(
                quests.B,
                quests.A,
                pools.B,
                pools.A,
                0,
                150
            ).crossPool
            pools.BC = getCP(
                quests.C,
                quests.B,
                pools.C,
                pools.B,
                0,
                75
            ).crossPool
            pools.CD = getCP(
                quests.D,
                quests.C,
                pools.D,
                pools.C,
                0,
                220
            ).crossPool

            token0 = quests.A.name
            token1 = quests.D.name
        })

        afterEach(() => {
            quests = {}
            pools = {}
        })

        it('tokenVolumes changes (amountIn > 1000)', () => {
            const volumeTokensBefore = Object.values(pools)
                .filter((p) => !p.isQuest())
                .map((p) => ({
                    name: p.name,
                    volumeToken0: p.volumeToken0,
                    volumeToken1: p.volumeToken1
                }))
            const router = createRouter(quests, pools, true)
            const amountIn = Math.round(Math.random() * 1000 + 1000)
            const result = router.smartSwap(token0, token1, amountIn)
            console.log('RESULT', result)
            const volumeTokensAfter = Object.values(pools)
                .filter((p) => !p.isQuest())
                .map((p) => ({
                    name: p.name,
                    volumeToken0: p.volumeToken0,
                    volumeToken1: p.volumeToken1
                }))

            expect(volumeTokensAfter).not.toEqual(
                expect.arrayContaining(volumeTokensBefore)
            )
            volumeTokensAfter.forEach((after) => {
                const before = volumeTokensBefore.find(
                    (poolBefore) => poolBefore === after.name
                )
                if (!before) return
                expect(after.volumeToken0).not.toEqual(before.volumeToken0)
                expect(after.volumeToken1).not.toEqual(before.volumeToken1)
            })
        })

        it('spent > 0 & received > 0 (amountIn > 1000)', () => {
            const router = createRouter(quests, pools, true)
            const amountIn = Math.ceil(Math.random() * 1)
            const result = router.smartSwap(token0, token1, amountIn)
            console.log(`amountIn: ${amountIn}\t\tRESULT ${result}`)
            const amountSpent = -result[0]
            const amountReceived = result[1]

            expect(amountSpent).toBeGreaterThanOrEqual(0)
            expect(amountReceived).toBeGreaterThanOrEqual(0)
        })

        it('spent ~== amountIn & received > 0 when amountIn < 100', () => {
            const router = createRouter(quests, pools, true)
            const amountIn = Math.ceil(Math.random() * 100)
            const result = router.smartSwap(token0, token1, amountIn)
            console.log(`amountIn: ${amountIn}\t\tRESULT ${result}`)
            const amountSpent = -result[0]
            const amountReceived = result[1]

            expect(amountSpent).toBeCloseTo(amountIn)
            expect(amountReceived).toBeGreaterThan(0)
        })

        fit('Properly changes position when buying out exact liquidity amount and avoids rounding errors', () => {
            const quests = new HashMap()
            const pools = new HashMap()

            const router = createRouter(quests.A, pools.A, true)
            const amountIn = Math.ceil(Math.random() * 100)
            const result = router.smartSwap(token0, token1, amountIn)
            console.log(`amountIn: ${amountIn}\t\tRESULT ${result}`)
            const amountSpent = -result[0]
            const amountReceived = result[1]

            expect(amountSpent).toBeCloseTo(amountIn)
            expect(amountReceived).toBeGreaterThan(0)
        })
    })
})
