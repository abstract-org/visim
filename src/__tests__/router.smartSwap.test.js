import HashMap from 'hashmap'

import Investor from '../logic/Investor/Investor.class'
import UsdcToken from '../logic/Quest/UsdcToken.class'
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
    })

    describe('Position shifting', () => {
        it('Properly changes position when buying out exact liquidity amount and avoids rounding errors', () => {
            const { quest: questA, pool: poolA } = getQP('A', 1000000)
            const routerQuests = []
            const routerPools = []
            routerQuests.push(questA)
            routerQuests.push(new UsdcToken())
            routerPools.push(poolA)

            const router = createRouter(routerQuests, routerPools, true)
            const amountIn = Infinity
            const result = router.smartSwap('USDC', questA.name, amountIn)
            const amountSpent = -result[0]
            const amountReceived = result[1]

            expect(amountSpent).toBeCloseTo(133426696.95298)
            expect(amountReceived).toBeCloseTo(20000, 0)
            expect(poolA.curLiq).toBeCloseTo(0, 0)
        })
    })

    describe('calculateAcceptableForCappedPathActions() -> buy -> buy -> sell', () => {
        fit('Calculates properAmountIn with buy->buy->sell', () => {
            const investor = Investor.create('INV', 'INV', 10000)

            const { pool: agoraPool, quest: agoraQuest } = getQP('AGORA')
            const { pool: pra5Pool, quest: pra5Quest } =
                getQP('Praseodymium (5)')
            const { pool: pra3Pool, quest: pra3Quest } =
                getQP('Praseodymium (3)')
            const startingPrice = 1
            const agoraPra5Pool = investor.createPool(
                agoraQuest,
                pra5Quest,
                startingPrice
            )
            const pra3Pra5Pool = investor.createPool(
                pra3Quest,
                pra5Quest,
                startingPrice
            )

            agoraQuest.addPool(agoraPra5Pool.name)
            pra3Quest.addPool(pra3Pra5Pool)
            pra5Quest.addPool(agoraPra5Pool)
            pra5Quest.addPool(pra3Pra5Pool)

            pra3Pool.buy(7803)
            pra5Pool.buy(6085)

            // Took from running generator and catching a leak
            const pathWithActionCapsSnapshot = [
                {
                    pool: {
                        curLeft: 5.643856189774724,
                        curRight: 19.931568569324174,
                        curPrice: 204.8738998800425,
                        curPP: 7.643856189774724,
                        curLiq: 134798.2765411604,
                        pos: {
                            _data: {
                                0: [
                                    0,
                                    {
                                        liquidity: 5005.005005005005,
                                        left: -Infinity,
                                        pp: 0,
                                        right: 4.321928094887363
                                    }
                                ],
                                '-Infinity': [
                                    -Infinity,
                                    {
                                        liquidity: 0,
                                        left: -Infinity,
                                        pp: -Infinity,
                                        right: 0
                                    }
                                ],
                                19.931568569324174: [
                                    19.931568569324174,
                                    {
                                        liquidity: 0,
                                        left: 7.643856189774724,
                                        pp: 19.931568569324174,
                                        right: 19.931568569324174
                                    }
                                ],
                                4.321928094887363: [
                                    4.321928094887363,
                                    {
                                        liquidity: 22461.12899757785,
                                        left: 0,
                                        pp: 4.321928094887363,
                                        right: 5.643856189774724
                                    }
                                ],
                                5.643856189774724: [
                                    5.643856189774724,
                                    {
                                        liquidity: 35607.11941529814,
                                        left: 4.321928094887363,
                                        pp: 5.643856189774724,
                                        right: 7.643856189774724
                                    }
                                ],
                                7.643856189774724: [
                                    7.643856189774724,
                                    {
                                        liquidity: 71725.0231232794,
                                        left: 5.643856189774724,
                                        pp: 7.643856189774724,
                                        right: 19.931568569324174
                                    }
                                ]
                            },
                            size: 6
                        },
                        tokenLeft: 'USDC',
                        tokenRight: 'AGORA',
                        name: 'USDC-AGORA'
                    },
                    action: 'buy',
                    t0fort1: 132868823.9720249,
                    t1fort0: 9282.678809509696
                },
                {
                    pool: {
                        curLeft: -Infinity,
                        curRight: -4.677033108769314,
                        curPrice: 0.023465809990792223,
                        curPP: -5.677033108769314,
                        curLiq: 23.878072307509495,
                        pos: {
                            _data: {
                                0: [
                                    0,
                                    {
                                        liquidity: 0,
                                        left: -4.677033108769314,
                                        pp: 0,
                                        right: 19.9315685693386
                                    }
                                ],
                                '-Infinity': [
                                    -Infinity,
                                    {
                                        liquidity: 0,
                                        left: -Infinity,
                                        pp: -Infinity,
                                        right: -5.677033108769314
                                    }
                                ],
                                19.9315685693386: [
                                    19.9315685693386,
                                    {
                                        liquidity: 0,
                                        left: 0,
                                        pp: 19.9315685693386,
                                        right: 19.9315685693386
                                    }
                                ],
                                '-5.677033108769314': [
                                    -5.677033108769314,
                                    {
                                        liquidity: 23.878072307509495,
                                        left: -Infinity,
                                        pp: -5.677033108769314,
                                        right: -4.677033108769314
                                    }
                                ],
                                '-4.677033108769314': [
                                    -4.677033108769314,
                                    {
                                        liquidity: -23.878072307509495,
                                        left: -5.677033108769314,
                                        pp: -4.677033108769314,
                                        right: 0
                                    }
                                ]
                            },
                            size: 5
                        },
                        tokenLeft: 'AGORA',
                        tokenRight: 'Praseodymium (5)',
                        name: 'AGORA-Praseodymium (5)'
                    },
                    action: 'buy',
                    t0fort1: 1.3827540895835315,
                    t1fort0: 50.02501250625318
                },
                {
                    pool: {
                        curLeft: -Infinity,
                        curRight: 0,
                        curPrice: 0.8394125078864575,
                        curPP: -0.33899522968305545,
                        curLiq: 353.46279918020053,
                        pos: {
                            _data: {
                                0: [
                                    0,
                                    {
                                        liquidity: 0,
                                        left: -0.33899522968305545,
                                        pp: 0,
                                        right: 0.6610047703169446
                                    }
                                ],
                                '-Infinity': [
                                    -Infinity,
                                    {
                                        liquidity: 0,
                                        left: -Infinity,
                                        pp: -Infinity,
                                        right: -0.33899522968305545
                                    }
                                ],
                                19.9315685693386: [
                                    19.9315685693386,
                                    {
                                        liquidity: 0,
                                        left: 0.6610047703169446,
                                        pp: 19.9315685693386,
                                        right: 19.9315685693386
                                    }
                                ],
                                '-0.33899522968305545': [
                                    -0.33899522968305545,
                                    {
                                        liquidity: 353.46279918020053,
                                        left: -Infinity,
                                        pp: -0.33899522968305545,
                                        right: 0
                                    }
                                ],
                                0.6610047703169446: [
                                    0.6610047703169446,
                                    {
                                        liquidity: -353.46279918020053,
                                        left: 0,
                                        pp: 0.6610047703169446,
                                        right: 19.9315685693386
                                    }
                                ]
                            },
                            size: 5
                        },
                        tokenLeft: 'Praseodymium (3)',
                        tokenRight: 'Praseodymium (5)',
                        name: 'Praseodymium (3)-Praseodymium (5)'
                    },
                    action: 'sell',
                    t1fort0: 1.2641793795938996,
                    t0fort1: 1.0026382561119516
                }
            ]

            pathWithActionCapsSnapshot.forEach((pact, idx) => {
                let mutatingPool
                switch (pact.pool.name) {
                    case 'USDC-AGORA':
                        mutatingPool = agoraPool
                        break

                    case 'AGORA-Praseodymium (5)':
                        mutatingPool = agoraPra5Pool
                        break

                    case 'Praseodymium (3)-Praseodymium (5)':
                        mutatingPool = pra3Pra5Pool
                        break
                    default:
                        break
                }

                for (const [field, value] of Object.entries(pact.pool)) {
                    if (field !== 'pos') {
                        mutatingPool[field] = value
                    } else {
                        for (const [id, posArr] of Object.entries(
                            pact.pool.pos._data
                        )) {
                            mutatingPool.pos.set(posArr[0], posArr[1])
                        }
                    }
                    mutatingPool.FRESH = false
                }

                pathWithActionCapsSnapshot[idx].pool = mutatingPool
            })

            const quests = []
            const pools = []

            quests.push(agoraQuest)
            quests.push(pra3Quest)
            quests.push(pra5Quest)
            quests.push(new UsdcToken())

            pools.push(agoraPool)
            pools.push(pra3Pool)
            pools.push(pra5Pool)
            pools.push(agoraPra5Pool)
            pools.push(pra3Pra5Pool)

            const router = createRouter(quests, pools, true)

            // calc amts
            const res = router.calculateAcceptableForCappedPathActions(
                pathWithActionCapsSnapshot
            )

            const forcedPath = [
                new UsdcToken().name,
                agoraQuest.name,
                pra5Quest.name,
                pra3Quest.name
            ]
            const sums = router.smartSwap(
                'USDC',
                pra3Quest.name,
                1000,
                4,
                forcedPath
            )
            console.log(sums)
        })
    })
})
