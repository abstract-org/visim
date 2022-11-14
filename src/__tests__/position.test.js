import Investor from '../logic/Investor/Investor.class'
import UsdcToken from '../logic/Quest/UsdcToken.class'
import { p2pp, pp2p } from '../logic/Utils/logicUtils'
import globalConfig from '../logic/config.global.json'
import { getQP } from './helpers/getQuestPools'
import { preparePool } from './helpers/poolManager'
import { SNAPSHOT_TRADED_CROSSPOOL } from './resources/tradedCrossPoolSnapshot'

describe('Position Manager', () => {
    it('Initializes with default positions', () => {
        const initialPositions = [
            {
                priceMin: 1,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            },
            {
                priceMin: 20,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            },
            {
                priceMin: 50,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            },
            {
                priceMin: 200,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            }
        ]
        const { pool } = preparePool(20000, 'creator', initialPositions)

        const p1 = pool.pos.get(p2pp(initialPositions[0].priceMin))
        const p20 = pool.pos.get(p2pp(initialPositions[1].priceMin))
        const p50 = pool.pos.get(p2pp(initialPositions[2].priceMin))
        const p200 = pool.pos.get(p2pp(initialPositions[3].priceMin))
        const p10k = pool.pos.get(p2pp(initialPositions[3].priceMax))

        expect(p1.liquidity).toBeCloseTo(
            pool.getLiquidityForAmounts(
                initialPositions[0].tokenA,
                initialPositions[0].tokenB,
                initialPositions[0].priceMin,
                initialPositions[0].priceMax,
                pool.curPrice
            )
        )
        expect(p1.left).toBeCloseTo(-Infinity)
        expect(p1.right).toBeCloseTo(p20.pp)

        expect(p20.liquidity).toBeCloseTo(
            pool.getLiquidityForAmounts(
                initialPositions[1].tokenA,
                initialPositions[1].tokenB,
                initialPositions[1].priceMin,
                initialPositions[1].priceMax,
                pool.curPrice
            )
        )
        expect(p20.left).toBeCloseTo(p1.pp)
        expect(p20.right).toBeCloseTo(p50.pp)

        expect(p50.liquidity).toBeCloseTo(
            pool.getLiquidityForAmounts(
                initialPositions[2].tokenA,
                initialPositions[2].tokenB,
                initialPositions[2].priceMin,
                initialPositions[2].priceMax,
                pool.curPrice
            )
        )
        expect(p50.left).toBeCloseTo(p20.pp)
        expect(p50.right).toBeCloseTo(p200.pp)

        expect(p200.liquidity).toBeCloseTo(
            pool.getLiquidityForAmounts(
                initialPositions[3].tokenA,
                initialPositions[3].tokenB,
                initialPositions[3].priceMin,
                initialPositions[3].priceMax,
                pool.curPrice
            )
        )
        expect(p200.left).toBeCloseTo(p50.pp)
        expect(p200.right).toBeCloseTo(p10k.pp)

        expect(p10k.liquidity).toBeCloseTo(
            -(p1.liquidity + p20.liquidity + p50.liquidity + p200.liquidity)
        )
        expect(p10k.left).toBeCloseTo(p200.pp)
        expect(p10k.right).toBeCloseTo(p2pp(globalConfig.PRICE_MAX))
    })

    it('Opens a new position and adjusts neighbors', () => {
        const initialPositions = [
            {
                priceMin: 1,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            },
            {
                priceMin: 20,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            },
            {
                priceMin: 50,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            },
            {
                priceMin: 200,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            }
        ]
        const { pool } = preparePool(20000, 'creator', initialPositions)

        const p10MinPrice = 10
        const p10MaxPrice = 1000
        const p10TokenA = 0
        const p10TokenB = 5000
        pool.openPosition(p10MinPrice, p10MaxPrice, p10TokenA, p10TokenB, false)

        const p1 = pool.pos.get(p2pp(initialPositions[0].priceMin))
        const p10 = pool.pos.get(p2pp(p10MinPrice))
        const p20 = pool.pos.get(p2pp(initialPositions[1].priceMin))
        const p50 = pool.pos.get(p2pp(initialPositions[2].priceMin))
        const p200 = pool.pos.get(p2pp(initialPositions[3].priceMin))
        const p1k = pool.pos.get(p2pp(p10MaxPrice))
        const p10k = pool.pos.get(p2pp(initialPositions[3].priceMax))

        expect(p10.liquidity).toBeCloseTo(
            pool.getLiquidityForAmounts(
                p10TokenA,
                p10TokenB,
                p10MinPrice,
                p10MaxPrice,
                pool.curPrice
            )
        )
        expect(p10.left).toBeCloseTo(p1.pp)
        expect(p10.right).toBeCloseTo(p20.pp)

        expect(p20.liquidity).toBeCloseTo(
            pool.getLiquidityForAmounts(
                initialPositions[1].tokenA,
                initialPositions[1].tokenB,
                initialPositions[1].priceMin,
                initialPositions[1].priceMax,
                pool.curPrice
            )
        )
        expect(p20.left).toBeCloseTo(p10.pp)
        expect(p20.right).toBeCloseTo(p50.pp)

        expect(p200.liquidity).toBeCloseTo(
            pool.getLiquidityForAmounts(
                initialPositions[3].tokenA,
                initialPositions[3].tokenB,
                initialPositions[3].priceMin,
                initialPositions[3].priceMax,
                pool.curPrice
            )
        )
        expect(p200.left).toBeCloseTo(p50.pp)
        expect(p200.right).toBeCloseTo(p1k.pp)

        expect(p1k.liquidity).toBeCloseTo(-p10.liquidity)
        expect(p1k.left).toBeCloseTo(p200.pp)
        expect(p1k.right).toBeCloseTo(p10k.pp)

        expect(p10k.liquidity).toBeCloseTo(
            -(p1.liquidity + p20.liquidity + p50.liquidity + p200.liquidity)
        )
        expect(p10k.left).toBeCloseTo(p1k.pp)
        expect(p10k.right).toBeCloseTo(p2pp(globalConfig.PRICE_MAX))
    })

    it('Removes liquidity partially from a position', () => {
        const initialPositions = [
            {
                priceMin: 1,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            },
            {
                priceMin: 20,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            },
            {
                priceMin: 50,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            },
            {
                priceMin: 200,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            }
        ]
        const { pool, investor } = preparePool(
            20000,
            'creator',
            initialPositions
        )

        const removeTokenA = 0
        const removeTokenB = 3000
        const oldPosition = pool.pos.get(p2pp(initialPositions[2].priceMin))
        expect(oldPosition.liquidity).toBeCloseTo(
            pool.getLiquidityForAmounts(
                initialPositions[2].tokenA,
                initialPositions[2].tokenB,
                initialPositions[2].priceMin,
                initialPositions[2].priceMax,
                pool.curPrice
            )
        )

        investor.removeLiquidity(
            pool,
            initialPositions[2].priceMin,
            initialPositions[2].priceMax,
            removeTokenA,
            removeTokenB
        )
        const newPosition = pool.pos.get(p2pp(initialPositions[2].priceMin))
        expect(newPosition.liquidity).toBeCloseTo(
            pool.getLiquidityForAmounts(
                initialPositions[2].tokenA,
                initialPositions[2].tokenB - removeTokenB,
                initialPositions[2].priceMin,
                initialPositions[2].priceMax,
                pool.curPrice
            )
        )
    })

    it('Deletes fully an open position and removes liquidity', () => {
        const initialPositions = [
            {
                priceMin: 1,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            },
            {
                priceMin: 20,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            },
            {
                priceMin: 50,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            },
            {
                priceMin: 200,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            }
        ]
        const { pool, investor } = preparePool(
            20000,
            'creator',
            initialPositions
        )

        const oldPosition = pool.pos.get(p2pp(initialPositions[2].priceMin))
        expect(oldPosition.liquidity).toBeCloseTo(
            pool.getLiquidityForAmounts(
                initialPositions[2].tokenA,
                initialPositions[2].tokenB,
                initialPositions[2].priceMin,
                initialPositions[2].priceMax,
                pool.curPrice
            )
        )

        investor.removeLiquidity(
            pool,
            initialPositions[2].priceMin,
            initialPositions[2].priceMax,
            initialPositions[2].tokenA,
            initialPositions[2].tokenB
        )

        const deletedPosition = pool.pos.get(p2pp(initialPositions[2].priceMin))
        expect(deletedPosition).toBeUndefined()
    })

    it('Updates position with new liquidity if already exists', () => {
        const initialPositions = [
            {
                priceMin: 1,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            },
            {
                priceMin: 20,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            },
            {
                priceMin: 50,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            },
            {
                priceMin: 200,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            }
        ]
        const { pool } = preparePool(20000, 'creator', initialPositions)

        const oldPosition = pool.pos.get(p2pp(20))
        expect(oldPosition.liquidity).toBeCloseTo(23407.494)

        pool.openPosition(20, 10000, 0, 5000, false)
        const newPosition = pool.pos.get(p2pp(20))
        expect(newPosition.liquidity).toBeCloseTo(46814.989)
    })

    it('Retrieves new balance when removing liquidity', () => {
        const initialPositions = [
            {
                priceMin: 1,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            },
            {
                priceMin: 20,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            },
            {
                priceMin: 50,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            },
            {
                priceMin: 200,
                priceMax: 10000,
                tokenB: 5000,
                tokenA: null
            }
        ]
        const { pool, investor, tokenLeft, tokenRight } = preparePool(
            20000,
            'creator',
            initialPositions
        )

        const [amountLeft, amountRight] = investor.removeLiquidity(
            pool,
            50,
            10000,
            0,
            3000
        )

        investor.addBalance(tokenLeft.name, amountLeft)
        investor.addBalance(tokenRight.name, amountRight)

        expect(pool.volumeToken1).toBeCloseTo(17000)
        expect(investor.balances[tokenRight.name]).toBeCloseTo(3000)
    })
})

describe('Price Range Manager', () => {
    const initialPositions = [
        {
            priceMin: 1,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        },
        {
            priceMin: 20,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        },
        {
            priceMin: 50,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        },
        {
            priceMin: 200,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        }
    ]

    it('calculates positions for maxed out A', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({
            tokenLeft: new UsdcToken(),
            initialPositions
        })
        const B = qB.createPool({ tokenLeft: new UsdcToken() })

        A.buy(999999999)

        const startingPrice = A.curPrice / B.curPrice
        const AB = investor.createPool(qB, qA, startingPrice)

        const ppAB = investor.calculatePriceRange(AB, B, A, 2)
        const ppBA = investor.calculatePriceRange(AB, A, B, 2)

        expect(ppAB.min).toBeCloseTo(10000, 0)
        expect(ppAB.max).toBeCloseTo(20000, 0)
        expect(ppBA.min).toBeCloseTo(5000, 0)
        expect(ppBA.max).toBeCloseTo(10000, 0)
        expect(ppAB.native).toBe(false)
        expect(ppBA.native).toBe(true)
    })

    it('calculates positions for maxed out B', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({ tokenLeft: new UsdcToken() })
        const B = qB.createPool({ tokenLeft: new UsdcToken() })

        B.buy(999999999)

        const startingPrice = A.curPrice / B.curPrice
        const AB = investor.createPool(qB, qA, startingPrice)

        const ppAB = investor.calculatePriceRange(AB, B, A, 2)
        const ppBA = investor.calculatePriceRange(AB, A, B, 2)

        expect(ppAB.min).toBeCloseTo(0.0001, 0)
        expect(ppAB.max).toBeCloseTo(0.0002, 0)
        expect(ppBA.min).toBeCloseTo(0.00005, 0)
        expect(ppBA.max).toBeCloseTo(0.0001, 0)
        expect(ppAB.native).toBe(false)
        expect(ppBA.native).toBe(true)
    })

    it('calculates price range for expensive citing token non-native', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({ tokenLeft: new UsdcToken() })
        const B = qB.createPool({ tokenLeft: new UsdcToken() })

        A.buy(25000)
        B.buy(5000)

        const startingPrice = A.curPrice / B.curPrice
        const multiplier = 2

        const expectedMinNonNative = startingPrice
        const expectedMaxNonNative = startingPrice * multiplier

        const expectedMinNative = startingPrice / multiplier
        const expectedMaxNative = startingPrice

        const AB = investor.createPool(qB, qA, startingPrice)
        const ppAB = investor.calculatePriceRange(AB, B, A, multiplier)
        const ppBA = investor.calculatePriceRange(AB, A, B, multiplier)

        expect(ppAB.min).toBeCloseTo(expectedMinNonNative, 2)
        expect(ppAB.max).toBeCloseTo(expectedMaxNonNative, 2)
        expect(ppBA.min).toBeCloseTo(expectedMinNative, 2)
        expect(ppBA.max).toBeCloseTo(expectedMaxNative, 2)
        expect(expectedMinNonNative).toBeCloseTo(expectedMaxNative, 2)
        expect(ppAB.native).toBe(false)
        expect(ppBA.native).toBe(true)
    })

    it('calculates positions for high B', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({ tokenLeft: new UsdcToken() })
        const B = qB.createPool({ tokenLeft: new UsdcToken() })

        A.buy(5000)
        B.buy(25000)

        const startingPrice = A.curPrice / B.curPrice
        const AB = investor.createPool(qB, qA, startingPrice)
        const ppAB = investor.calculatePriceRange(AB, B, A, 2)
        const ppBA = investor.calculatePriceRange(AB, A, B, 2)

        expect(ppAB.min).toBeCloseTo(0.27, 0)
        expect(ppAB.max).toBeCloseTo(0.54, 0)
        expect(ppBA.min).toBeCloseTo(0.14, 0)
        expect(ppBA.max).toBeCloseTo(0.27, 0)
        expect(ppAB.native).toBe(false)
        expect(ppBA.native).toBe(true)
    })

    it('calculates positions for equal A and B with multiplier 3', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({ tokenLeft: new UsdcToken() })
        const B = qB.createPool({ tokenLeft: new UsdcToken() })

        A.buy(25000)
        B.buy(25000)

        const startingPrice = A.curPrice / B.curPrice
        const AB = investor.createPool(qB, qA, startingPrice)
        const ppAB = investor.calculatePriceRange(AB, B, A, 3)
        const ppBA = investor.calculatePriceRange(AB, A, B, 3)

        expect(ppAB.min).toBeCloseTo(1)
        expect(ppAB.max).toBeCloseTo(3)
        expect(ppBA.min).toBeCloseTo(0.33, 0)
        expect(ppBA.max).toBeCloseTo(1)
        expect(ppAB.native).toBe(false)
        expect(ppBA.native).toBe(true)
    })

    it('calculates positions for default A and B', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({ tokenLeft: new UsdcToken() })
        const B = qB.createPool({ tokenLeft: new UsdcToken() })

        const startingPrice = A.curPrice / B.curPrice
        const AB = investor.createPool(qB, qA, startingPrice)
        const ppAB = investor.calculatePriceRange(AB, B, A, 2)
        const ppBA = investor.calculatePriceRange(AB, A, B, 2)

        expect(ppAB.min).toBeCloseTo(1)
        expect(ppAB.max).toBeCloseTo(2)
        expect(ppBA.min).toBeCloseTo(0.5)
        expect(ppBA.max).toBeCloseTo(1)
        expect(ppAB.native).toBe(false)
        expect(ppBA.native).toBe(true)
    })

    it('calculates positions for maxed out A and B', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({ tokenLeft: new UsdcToken() })
        const B = qB.createPool({ tokenLeft: new UsdcToken() })

        A.buy(999999999)
        B.buy(999999999)

        const startingPrice = A.curPrice / B.curPrice
        const AB = investor.createPool(qB, qA, startingPrice)
        const ppAB = investor.calculatePriceRange(AB, B, A, 2)
        const ppBA = investor.calculatePriceRange(AB, A, B, 2)

        expect(ppAB.min).toBeCloseTo(1)
        expect(ppAB.max).toBeCloseTo(2)
        expect(ppBA.min).toBeCloseTo(0.5, 0)
        expect(ppBA.max).toBeCloseTo(1)
        expect(ppAB.native).toBe(false)
        expect(ppBA.native).toBe(true)
    })
})

describe('Citation Manager', () => {
    const initialPositions = [
        {
            priceMin: 1,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        },
        {
            priceMin: 20,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        },
        {
            priceMin: 50,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        },
        {
            priceMin: 200,
            priceMax: 10000,
            tokenB: 5000,
            tokenA: null
        }
    ]
    it('Returns totalIn positive when citing non-native direction', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({ tokenLeft: new UsdcToken() })
        const B = qB.createPool({ tokenLeft: new UsdcToken() })
        const startingPrice = A.curPrice / B.curPrice
        const AB = investor.createPool(qB, qA, startingPrice)

        const ppAB = investor.calculatePriceRange(AB, B, A, 2)

        const [totalIn, totalOut] = investor.citeQuest(
            AB,
            ppAB.min,
            ppAB.max,
            0,
            1000,
            ppAB.native
        )

        expect(totalIn).toBeCloseTo(1000, 0)
    })

    it('Returns totalIn positive when citing native direction', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({ tokenLeft: new UsdcToken() })
        const B = qB.createPool({ tokenLeft: new UsdcToken() })
        const startingPrice = A.curPrice / B.curPrice
        const AB = investor.createPool(qB, qA, startingPrice)

        const ppBA = investor.calculatePriceRange(AB, A, B, 2)

        const [totalIn, totalOut] = investor.citeQuest(
            AB,
            ppBA.min,
            ppBA.max,
            1000,
            0,
            ppBA.native
        )

        expect(totalIn).toBeCloseTo(1000, 0)
    })

    it('Cites both sides with default prices in cross pool', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({
            tokenLeft: new UsdcToken(),
            initialPositions
        })
        const B = qB.createPool({
            tokenLeft: new UsdcToken(),
            initialPositions
        })
        const startingPrice = A.curPrice / B.curPrice
        const AB = investor.createPool(qB, qA, startingPrice)

        const ppAB = investor.calculatePriceRange(AB, B, A, 2)
        const ppBA = investor.calculatePriceRange(AB, A, B, 2)

        investor.citeQuest(AB, ppAB.min, ppAB.max, 0, 1000, false)
        investor.citeQuest(AB, ppBA.min, ppBA.max, 1000, 0, true)

        const posOwnerAB = AB.posOwners.find(
            (p) => p.hash === investor.hash && p.amt1 === 1000
        )
        const posOwnerBA = AB.posOwners.find(
            (p) => p.hash === investor.hash && p.amt0 === 1000
        )

        const posMinAB = AB.pos.get(p2pp(ppAB.min))
        const posMaxAB = AB.pos.get(p2pp(ppAB.max))

        const posMinBA = AB.pos.get(p2pp(ppBA.min))
        const posMaxBA = AB.pos.get(p2pp(ppBA.max))

        expect(AB.volumeToken0).toBeCloseTo(1000)
        expect(AB.volumeToken1).toBeCloseTo(1000)
        expect(AB.curPrice).toBeCloseTo(1)
        expect(AB.pos.get(-1.0000000000001443).liquidity).toBeCloseTo(3414, 0)
        expect(AB.pos.get(-1.4431436399686926e-13).liquidity).toBeCloseTo(
            -3414,
            0
        )

        // A->B
        expect(posMinAB.liquidity).toBeCloseTo(3414.2, 0)
        expect(posMaxAB.liquidity).toBeCloseTo(-3414.2, 0)

        expect(posOwnerAB.amt1).toBeCloseTo(1000)
        expect(posOwnerAB.pmin).toBeCloseTo(1)
        expect(posOwnerAB.pmax).toBeCloseTo(2)

        // B->A
        expect(posOwnerBA.amt0).toBeCloseTo(1000)
        expect(posOwnerBA.pmin).toBeCloseTo(0.5)
        expect(posOwnerBA.pmax).toBeCloseTo(1)

        expect(posMinBA.liquidity).toBeCloseTo(3414.2, 0)
        expect(posMaxBA.liquidity).toBeCloseTo(-3414.2, 0)
    })

    it('Cites both sides with maxed out A', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({
            tokenLeft: new UsdcToken(),
            initialPositions
        })
        const B = qB.createPool({
            tokenLeft: new UsdcToken(),
            initialPositions
        })
        A.buy(999999999)

        const startingPrice = A.curPrice / B.curPrice
        const AB = investor.createPool(qB, qA, startingPrice)

        const ppAB = investor.calculatePriceRange(AB, B, A, 2)
        const ppBA = investor.calculatePriceRange(AB, A, B, 2)

        investor.citeQuest(AB, ppAB.min, ppAB.max, 0, 1000, false)
        investor.citeQuest(AB, ppBA.min, ppBA.max, 1000, 0, true)

        const posOwnerAB = AB.posOwners.find(
            (p) => p.hash === investor.hash && p.amt1 === 1000
        )
        const posOwnerBA = AB.posOwners.find(
            (p) => p.hash === investor.hash && p.amt0 === 1000
        )

        const posMinAB = AB.pos.get(p2pp(ppAB.min))
        const posMaxAB = AB.pos.get(p2pp(ppAB.max))

        const posMinBA = AB.pos.get(p2pp(ppBA.min))
        const posMaxBA = AB.pos.get(p2pp(ppBA.max))

        expect(AB.volumeToken0).toBeCloseTo(1000)
        expect(AB.volumeToken1).toBeCloseTo(1000)
        expect(AB.curPrice).toBeCloseTo(10000)
        expect(AB.pos.get(p2pp(10000)).liquidity).toBeCloseTo(341387, 0)
        expect(AB.pos.get(p2pp(5000)).liquidity).toBeCloseTo(34, 0)
        expect(AB.pos.get(p2pp(20000)).liquidity).toBeCloseTo(-341421, 0)

        // A->B
        expect(posMinAB.liquidity).toBeCloseTo(341387, 0)
        expect(posMaxAB.liquidity).toBeCloseTo(-341421, 0)

        expect(posOwnerAB.amt1).toBeCloseTo(1000)
        expect(posOwnerAB.pmin).toBeCloseTo(10000, 0)
        expect(posOwnerAB.pmax).toBeCloseTo(20000, 0)

        // B->A
        expect(posOwnerBA.amt0).toBeCloseTo(1000)
        expect(posOwnerBA.pmin).toBeCloseTo(5000, 0)
        expect(posOwnerBA.pmax).toBeCloseTo(10000, 0)

        expect(posMinBA.liquidity).toBeCloseTo(34, 0)
        expect(posMaxBA.liquidity).toBeCloseTo(341387, 0)
    })

    it('Cites both sides with maxed out B', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({
            tokenLeft: new UsdcToken(),
            initialPositions
        })
        const B = qB.createPool({
            tokenLeft: new UsdcToken(),
            initialPositions
        })
        B.buy(999999999)

        const startingPrice = A.curPrice / B.curPrice
        const AB = investor.createPool(qB, qA, startingPrice)

        const ppAB = investor.calculatePriceRange(AB, B, A, 2)
        const ppBA = investor.calculatePriceRange(AB, A, B, 2)

        investor.citeQuest(AB, ppAB.min, ppAB.max, 0, 1000, false)
        const res = investor.citeQuest(AB, ppBA.min, ppBA.max, 1000, 0, true)

        const dryBuy = AB.dryBuy(Infinity)
        const drySell = AB.drySell(Infinity)

        const posOwnerAB = AB.posOwners.find(
            (p) => p.hash === investor.hash && p.amt1 === 1000
        )
        const posOwnerBA = AB.posOwners.find(
            (p) => p.hash === investor.hash && p.amt0 === 1000
        )

        const posMinAB = AB.pos.get(p2pp(ppAB.min))
        const posMaxAB = AB.pos.get(p2pp(ppAB.max))

        const posMinBA = AB.pos.get(p2pp(ppBA.min))
        const posMaxBA = AB.pos.get(p2pp(ppBA.max))

        expect(res[0]).toBeCloseTo(1000, 0)
        expect(dryBuy[1]).toBeCloseTo(1000, 0)
        expect(drySell[1]).toBeCloseTo(1000, 0)

        expect(AB.volumeToken0).toBeCloseTo(1000)
        expect(AB.volumeToken1).toBeCloseTo(1000)
        expect(AB.curPrice).toBeCloseTo(0.0002)
        expect(AB.pos.get(p2pp(ppAB.min)).liquidity).toBeCloseTo(34.14, 2)
        expect(AB.pos.get(p2pp(ppAB.max)).liquidity).toBeCloseTo(-34.14, 0)
        expect(AB.pos.get(p2pp(ppBA.min)).liquidity).toBeCloseTo(341421, 0)
        expect(AB.pos.get(p2pp(ppBA.max)).liquidity).toBeCloseTo(-341421, 0)

        // A->B
        expect(posMinAB.liquidity).toBeCloseTo(34.14, 0)
        expect(posMaxAB.liquidity).toBeCloseTo(-34.14, 0)

        expect(posOwnerAB.amt1).toBeCloseTo(1000)
        expect(posOwnerAB.pmin).toBeCloseTo(0.0001, 0)
        expect(posOwnerAB.pmax).toBeCloseTo(0.0002, 0)

        // B->A
        expect(posMinBA.liquidity).toBeCloseTo(341421, 0)
        expect(posMaxBA.liquidity).toBeCloseTo(-341421, 0)

        expect(posOwnerBA.amt0).toBeCloseTo(1000)
        expect(posOwnerBA.pmin).toBeCloseTo(0.0005, 0)
        expect(posOwnerBA.pmax).toBeCloseTo(0.0001, 0)
    })

    // @TODO: Redo test + add the same with higher B
    it('Cites both sides with higher A', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({
            tokenLeft: new UsdcToken(),
            initialPositions
        })
        const B = qB.createPool({
            tokenLeft: new UsdcToken(),
            initialPositions
        })

        A.buy(25000)
        B.buy(5000)
        const startingPrice = A.curPrice / B.curPrice
        const AB = investor.createPool(qB, qA, startingPrice)

        const ppAB = investor.calculatePriceRange(AB, B, A, 2)
        const ppBA = investor.calculatePriceRange(AB, A, B, 2)

        investor.citeQuest(AB, ppAB.min, ppAB.max, 0, 1000, false)
        investor.citeQuest(AB, ppBA.min, ppBA.max, 1000, 0, true)

        const posOwnerAB = AB.posOwners.find(
            (p) => p.hash === investor.hash && p.amt1 === 1000
        )
        const posOwnerBA = AB.posOwners.find(
            (p) => p.hash === investor.hash && p.amt0 === 1000
        )

        const posMinAB = AB.pos.get(p2pp(ppAB.min))
        const posMaxAB = AB.pos.get(p2pp(ppAB.max))

        const posMinBA = AB.pos.get(p2pp(ppBA.min))
        const posMaxBA = AB.pos.get(p2pp(ppBA.max))

        expect(AB.volumeToken0).toBeCloseTo(1000)
        expect(AB.volumeToken1).toBeCloseTo(1000)
        expect(AB.curPrice).toBeCloseTo(5.66, 0) // was 3.69
    })

    it('Sums up liquidity on multiple positions opened on cross-pool', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({
            tokenLeft: new UsdcToken(),
            initialPositions
        })
        const B = qB.createPool({
            tokenLeft: new UsdcToken(),
            initialPositions
        })

        A.buy(5000)
        B.buy(50000)

        const token0in = 0
        const token1in = 1000
        const multiplier = 2
        const native = false
        const startingPrice = A.curPrice / B.curPrice
        const AB = investor.createPool(qB, qA, startingPrice)
        const ppAB = investor.calculatePriceRange(AB, B, A, multiplier)

        let expectedLiquidityArr = []
        Array.from({ length: 5 }).forEach(() =>
            expectedLiquidityArr.push(
                AB.getLiquidityForAmounts(
                    token0in,
                    token1in,
                    ppAB.min,
                    ppAB.max,
                    AB.curPrice
                )
            )
        )
        const expectedLiquidity = expectedLiquidityArr.reduce(
            (acc, cur) => acc + cur
        )

        investor.citeQuest(AB, ppAB.min, ppAB.max, token0in, token1in, native)
        investor.citeQuest(AB, ppAB.min, ppAB.max, token0in, token1in, native)
        investor.citeQuest(AB, ppAB.min, ppAB.max, token0in, token1in, native)
        investor.citeQuest(AB, ppAB.min, ppAB.max, token0in, token1in, native)
        investor.citeQuest(AB, ppAB.min, ppAB.max, token0in, token1in, native)

        const poolTotalLiq = AB.pos
            .values()
            .reduce(
                (acc, cur) => acc + (cur.liquidity > 0 ? cur.liquidity : 0),
                0
            )

        expect(poolTotalLiq).toBeCloseTo(expectedLiquidity)
    })

    it('Citing traded cross pool', () => {
        const investor = Investor.create('INV', 'INV', 10000)
        const { pool: agoraPool, quest: agoraQuest } = getQP('AGORA')
        const { pool: pra5Pool, quest: pra5Quest } = getQP('Praseodymium (5)')
        const { pool: pra7Pool, quest: pra7Quest } = getQP('Praseodymium (7)')
        const startingPrice = 1
        const agoraPra7Pool = investor.createPool(
            agoraQuest,
            pra7Quest,
            startingPrice
        )
        const agoraPra5Pool = investor.createPool(
            agoraQuest,
            pra5Quest,
            startingPrice
        )

        const poolSnapshot = SNAPSHOT_TRADED_CROSSPOOL

        poolSnapshot.forEach((pact, idx) => {
            let mutatingPool
            switch (pact.pool.name) {
                case 'AGORA-Praseodymium (7)':
                    mutatingPool = agoraPra7Pool
                    break
                case 'AGORA-Praseodymium (5)':
                    mutatingPool = agoraPra5Pool
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

            poolSnapshot[idx].pool = mutatingPool
        })

        const priceRange = {
            min: 0.02997778868016155,
            max: 0.04271557736032315,
            native: false
        }
        investor.citeQuest(
            agoraPra7Pool,
            priceRange.min,
            priceRange.max,
            0,
            70.372,
            priceRange.native
        )

        expect(
            agoraPra7Pool.pos.get(p2pp(agoraPra7Pool.curPrice)).pp
        ).toBeCloseTo(p2pp(agoraPra7Pool.curPrice))

        const priceRangeSecond = {
            min: 0.03073777043176085,
            max: 0.04443554086352175,
            native: false
        }

        investor.citeQuest(
            agoraPra5Pool,
            priceRangeSecond.min,
            priceRangeSecond.max,
            0,
            68.359,
            priceRangeSecond.native
        )

        expect(
            agoraPra5Pool.pos.get(p2pp(agoraPra5Pool.curPrice)).pp
        ).toBeCloseTo(p2pp(agoraPra5Pool.curPrice))
    })
})
