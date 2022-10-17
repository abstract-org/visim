import Investor from '../logic/Investor/Investor.class'
import UsdcToken from '../logic/Quest/UsdcToken.class'
import { p2pp } from '../logic/Utils/logicUtils'
import { preparePool } from './helpers/poolManager'

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
        const p20 = pool.pos.get(p2pp(20))
        const p50 = pool.pos.get(p2pp(50))
        const p200 = pool.pos.get(p2pp(200))
        const p10k = pool.pos.get(p2pp(10000))

        expect(p20.liquidity).toBeCloseTo(23407.494)
        expect(p50.left).toBe(p2pp(20))
        expect(p50.liquidity).toBeCloseTo(38045.566)
        expect(p200.right).toBe(p2pp(10000))
        expect(p200.liquidity).toBeCloseTo(82357.834)
        expect(p10k.right).toBe(p2pp(1000000))
        expect(p10k.liquidity).toBeCloseTo(-148861.401)
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

        pool.openPosition(10, 1000, 0, 5000, false)
        const p20 = pool.pos.get(p2pp(20))
        const p1k = pool.pos.get(p2pp(1000))

        expect(p20.left).toBeCloseTo(p2pp(10))
        expect(p20.right).toBeCloseTo(p2pp(50))
        expect(p20.liquidity).toBeCloseTo(23407, 0)

        expect(p1k.left).toBeCloseTo(p2pp(200))
        expect(p1k.right).toBeCloseTo(p2pp(10000))
        expect(p1k.liquidity).toBeCloseTo(-17568.209)
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

        const oldPosition = pool.pos.get(p2pp(50))
        expect(oldPosition.liquidity).toBeCloseTo(38045.566)

        investor.removeLiquidity(pool, 50, 10000, 0, 3000)
        const newPosition = pool.pos.get(p2pp(50))
        expect(newPosition.liquidity).toBeCloseTo(15218.226)
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

        const oldPosition = pool.pos.get(p2pp(50))
        expect(oldPosition.liquidity).toBeCloseTo(38045.566)

        investor.removeLiquidity(pool, 50, 10000, 5000)

        const deletedPosition = pool.pos.get(50)
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

        expect(pool.volumeToken1).toBe(17000)
        expect(investor.balances[tokenRight.name]).toBe(3000)
    })
})

describe('Price Range Manager', () => {
    it('calculates positions for maxed out A', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({ tokenLeft: new UsdcToken() })
        const B = qB.createPool({ tokenLeft: new UsdcToken() })

        A.buy(999999999)

        const startingPrice = qA.curPrice / qB.curPrice
        const AB = qA.createPool({ tokenLeft: qB, startingPrice })

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

        const startingPrice = qA.curPrice / qB.curPrice
        const AB = qA.createPool({ tokenLeft: qB, startingPrice })

        const ppAB = investor.calculatePriceRange(AB, B, A, 2)
        const ppBA = investor.calculatePriceRange(AB, A, B, 2)

        expect(ppAB.min).toBeCloseTo(0.0001, 0)
        expect(ppAB.max).toBeCloseTo(0.0002, 0)
        expect(ppBA.min).toBeCloseTo(0.00005, 0)
        expect(ppBA.max).toBeCloseTo(0.0001, 0)
        expect(ppAB.native).toBe(false)
        expect(ppBA.native).toBe(true)
    })

    it('calculates positions for high A', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({ tokenLeft: new UsdcToken() })
        const B = qB.createPool({ tokenLeft: new UsdcToken() })

        A.buy(25000)
        B.buy(5000)

        const startingPrice = qA.curPrice / qB.curPrice
        const AB = qA.createPool({ tokenLeft: qB, startingPrice })

        const ppAB = investor.calculatePriceRange(AB, B, A, 2)
        const ppBA = investor.calculatePriceRange(AB, A, B, 2)

        expect(ppAB.min).toBeCloseTo(3.7, 0)
        expect(ppAB.max).toBeCloseTo(7.2, 0)
        expect(ppBA.min).toBeCloseTo(1.8, 0)
        expect(ppBA.max).toBeCloseTo(3.7, 0)
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

        const startingPrice = qA.curPrice / qB.curPrice
        const AB = qA.createPool({ tokenLeft: qB, startingPrice })

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

        const startingPrice = qA.curPrice / qB.curPrice
        const AB = qA.createPool({ tokenLeft: qB, startingPrice })

        const ppAB = investor.calculatePriceRange(AB, B, A, 3)
        const ppBA = investor.calculatePriceRange(AB, A, B, 3)

        expect(ppAB.min).toBe(1)
        expect(ppAB.max).toBe(3)
        expect(ppBA.min).toBeCloseTo(0.33, 0)
        expect(ppBA.max).toBe(1)
        expect(ppAB.native).toBe(false)
        expect(ppBA.native).toBe(true)
    })

    it('calculates positions for default A and B', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({ tokenLeft: new UsdcToken() })
        const B = qB.createPool({ tokenLeft: new UsdcToken() })

        const startingPrice = qA.curPrice / qB.curPrice
        const AB = qA.createPool({ tokenLeft: qB, startingPrice })

        const ppAB = investor.calculatePriceRange(AB, B, A, 2)
        const ppBA = investor.calculatePriceRange(AB, A, B, 2)

        expect(ppAB.min).toBe(1)
        expect(ppAB.max).toBe(2)
        expect(ppBA.min).toBe(0.5)
        expect(ppBA.max).toBe(1)
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

        const startingPrice = qA.curPrice / qB.curPrice
        const AB = qA.createPool({ tokenLeft: qB, startingPrice })

        const ppAB = investor.calculatePriceRange(AB, B, A, 2)
        const ppBA = investor.calculatePriceRange(AB, A, B, 2)

        expect(ppAB.min).toBe(1)
        expect(ppAB.max).toBe(2)
        expect(ppBA.min).toBeCloseTo(0.5, 0)
        expect(ppBA.max).toBe(1)
        expect(ppAB.native).toBe(false)
        expect(ppBA.native).toBe(true)
    })
})

describe('Citation Manager', () => {
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
        const A = qA.createPool({ tokenLeft: new UsdcToken() })
        const B = qB.createPool({ tokenLeft: new UsdcToken() })
        const startingPrice = qA.curPrice / qB.curPrice
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

        expect(AB.volumeToken0).toBe(1000)
        expect(AB.volumeToken1).toBe(1000)
        expect(AB.curPrice).toBe(1)
        expect(AB.pos.get(-1).liquidity).toBeCloseTo(3414, 0)
        expect(AB.pos.get(0).liquidity).toBeCloseTo(0, 0)
        expect(AB.pos.get(1).liquidity).toBeCloseTo(-3414, 0)

        // A->B
        expect(posMinAB.liquidity).toBeCloseTo(0)
        expect(posMaxAB.liquidity).toBeCloseTo(-3414, 0)

        expect(posOwnerAB.amt1).toBe(1000)
        expect(posOwnerAB.pmin).toBe(1)
        expect(posOwnerAB.pmax).toBe(2)

        // B->A
        expect(posOwnerBA.amt0).toBe(1000)
        expect(posOwnerBA.pmin).toBe(0.5)
        expect(posOwnerBA.pmax).toBe(1)

        expect(posMinBA.liquidity).toBeCloseTo(3414, 0)
        expect(posMaxBA.liquidity).toBeCloseTo(0, 0)
    })

    it('Cites both sides with maxed out A', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({ tokenLeft: new UsdcToken() })
        const B = qB.createPool({ tokenLeft: new UsdcToken() })
        const startingPrice = qA.curPrice / qB.curPrice
        const AB = investor.createPool(qB, qA, startingPrice)

        A.buy(999999999)

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

        expect(AB.volumeToken0).toBe(1000)
        expect(AB.volumeToken1).toBe(1000)
        expect(AB.curPrice).toBeCloseTo(10000)
        expect(AB.pos.get(p2pp(10000)).liquidity).toBeCloseTo(341387, 0)
        expect(AB.pos.get(p2pp(5000)).liquidity).toBeCloseTo(34, 0)
        expect(AB.pos.get(p2pp(20000)).liquidity).toBeCloseTo(-341421, 0)

        // A->B
        expect(posMinAB.liquidity).toBeCloseTo(341387, 0)
        expect(posMaxAB.liquidity).toBeCloseTo(-341421, 0)

        expect(posOwnerAB.amt1).toBe(1000)
        expect(posOwnerAB.pmin).toBeCloseTo(10000, 0)
        expect(posOwnerAB.pmax).toBeCloseTo(20000, 0)

        // B->A
        expect(posOwnerBA.amt0).toBe(1000)
        expect(posOwnerBA.pmin).toBeCloseTo(5000, 0)
        expect(posOwnerBA.pmax).toBeCloseTo(10000, 0)

        expect(posMinBA.liquidity).toBeCloseTo(34, 0)
        expect(posMaxBA.liquidity).toBeCloseTo(341387, 0)
    })

    it('Cites both sides with maxed out B', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({ tokenLeft: new UsdcToken() })
        const B = qB.createPool({ tokenLeft: new UsdcToken() })
        const startingPrice = qA.curPrice / qB.curPrice
        const AB = investor.createPool(qB, qA, startingPrice)

        B.buy(999999999)

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

        expect(AB.volumeToken0).toBe(1000)
        expect(AB.volumeToken1).toBe(1000)
        expect(AB.curPrice).toBeCloseTo(0.0002)
        expect(AB.pos.get(p2pp(0.0001)).liquidity).toBeCloseTo(-141387, 0)
        expect(AB.pos.get(p2pp(0.0002)).liquidity).toBeCloseTo(-34, 0)
        expect(AB.pos.get(p2pp(0.00005)).liquidity).toBeCloseTo(141421, 0)

        // A->B
        expect(posMinAB.liquidity).toBeCloseTo(-141387, 0)
        expect(posMaxAB.liquidity).toBeCloseTo(-34, 0)

        expect(posOwnerAB.amt1).toBe(1000)
        expect(posOwnerAB.pmin).toBeCloseTo(0.0001, 0)
        expect(posOwnerAB.pmax).toBeCloseTo(0.0002, 0)

        // B->A
        expect(posOwnerBA.amt0).toBe(1000)
        expect(posOwnerBA.pmin).toBeCloseTo(0.0005, 0)
        expect(posOwnerBA.pmax).toBeCloseTo(0.0001, 0)

        expect(posMinBA.liquidity).toBeCloseTo(141421, 0)
        expect(posMaxBA.liquidity).toBeCloseTo(-141387, 0)
    })

    it('Cites both sides with higher A', () => {
        const investor = Investor.create('Author', 'Author', 10000)
        const qA = investor.createQuest('A')
        const qB = investor.createQuest('B')
        const A = qA.createPool({ tokenLeft: new UsdcToken() })
        const B = qB.createPool({ tokenLeft: new UsdcToken() })
        const startingPrice = qA.curPrice / qB.curPrice
        const AB = investor.createPool(qB, qA, startingPrice)

        A.buy(25000)
        B.buy(5000)

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

        expect(AB.volumeToken0).toBe(1000)
        expect(AB.volumeToken1).toBe(1000)
        expect(AB.curPrice).toBeCloseTo(3.69, 0)
        expect(AB.pos.get(p2pp(3.6865236241563073)).liquidity).toBeCloseTo(
            4777,
            0
        )
        expect(AB.pos.get(p2pp(7.373047248312615)).liquidity).toBeCloseTo(
            -6555,
            0
        )
        expect(AB.pos.get(p2pp(1.8432618120781536)).liquidity).toBeCloseTo(
            1778,
            0
        )

        // A->B
        expect(posMinAB.liquidity).toBeCloseTo(4777, 0)
        expect(posMaxAB.liquidity).toBeCloseTo(-6555, 0)

        expect(posOwnerAB.amt1).toBe(1000)
        expect(posOwnerAB.pmin).toBeCloseTo(3.69, 0)
        expect(posOwnerAB.pmax).toBeCloseTo(7.37, 0)

        // B->A
        expect(posOwnerBA.amt0).toBe(1000)
        expect(posOwnerBA.pmin).toBeCloseTo(1.84, 0)
        expect(posOwnerBA.pmax).toBeCloseTo(3.68, 0)

        expect(posMinBA.liquidity).toBeCloseTo(1778, 0)
        expect(posMaxBA.liquidity).toBeCloseTo(4777, 0)
    })
})
