import HashMap from 'hashmap'

import Investor from '../logic/Investor/Investor.class'
import UsdcToken from '../logic/Quest/UsdcToken.class'
import { p2pp, pp2p } from '../logic/Utils/logicUtils'
import { preparePool } from './helpers/poolManager'

let globalState = {
    pools: new HashMap(),
    investors: new HashMap(),
    quests: new HashMap()
}

beforeAll(() => {})

afterEach(() => {
    globalState = {
        pools: new HashMap(),
        investors: new HashMap(),
        quests: new HashMap()
    }
})

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
    const { pool, investor } = preparePool(20000, 'creator', initialPositions)

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
    const { pool, investor } = preparePool(20000, 'creator', initialPositions)

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

it('Opens positions in both directions with price multiplier', () => {
    const investor = Investor.create('investor', 'investor', 100000)
    const questA = investor.createQuest('questA')
    const questB = investor.createQuest('questB')

    const poolA = questA.createPool({ tokenLeft: new UsdcToken() })
    const poolB = questB.createPool({ tokenLeft: new UsdcToken() })

    poolA.buy(269000)

    const crossPool = investor.createPool(questB, questA)
    const priceRange = investor.calculatePriceRange(crossPool, poolB, poolA, 2)
    investor.citeQuest(
        crossPool,
        priceRange.min,
        priceRange.max,
        132,
        0,
        priceRange.native
    )

    const priceRange2 = investor.calculatePriceRange(crossPool, poolA, poolB, 2)
    investor.citeQuest(
        crossPool,
        priceRange2.min,
        priceRange2.max,
        0,
        1,
        priceRange2.native
    )

    console.log(
        priceRange,
        priceRange2,
        crossPool.priceToken0,
        crossPool.priceToken1
    )

    expect(priceRange.min).toBeCloseTo(100, 0) // Min price to buy B with A
    expect(priceRange.max).toBeCloseTo(200, 0) // Min price to buy B with A

    expect(priceRange2.min).toBeCloseTo(50, 0) // Min price to buy A with B
    expect(priceRange2.max).toBeCloseTo(100, 0) // Min price to buy A with B

    expect(crossPool.priceToken0).toBeCloseTo(5000, 0)
    expect(crossPool.priceToken1).toBeCloseTo(1.18, 0)

    expect(crossPool.curPP).toBeCloseTo(p2pp(priceRange.max))

    expect(crossPool.pos.get(p2pp(priceRange.min)).liquidity).toBeCloseTo(
        378,
        0
    )
    expect(crossPool.pos.get(p2pp(priceRange.max)).liquidity).toBeCloseTo(
        -378,
        0
    )

    expect(crossPool.pos.get(p2pp(priceRange2.min)).liquidity).toBeCloseTo(
        3.7,
        0
    )
    expect(crossPool.pos.get(p2pp(priceRange2.max)).liquidity).toBeCloseTo(
        -3.7,
        0
    )
})

it('Opens positions in both directions with A pool maxed out', () => {
    const investor = Investor.create('investor', 'investor', 100000)
    const questA = investor.createQuest('questA')
    const questB = investor.createQuest('questB')

    const poolA = questA.createPool({ tokenLeft: new UsdcToken() })
    const poolB = questB.createPool({ tokenLeft: new UsdcToken() })

    poolA.buy(1000000000)

    const crossPool = investor.createPool(questB, questA) // base-unit B/A buy (in: B, out: A) sell (in: A out: B)
    const priceRange = investor.calculatePriceRange(crossPool, poolB, poolA, 2) // A citing B (1A in for 10k...20kB)
    investor.citeQuest(
        crossPool,
        priceRange.min,
        priceRange.max,
        0,
        132,
        priceRange.native
    )

    const priceRange2 = investor.calculatePriceRange(crossPool, poolA, poolB, 2) // B citing A (1B in for 0.00005...0.0001A)
    investor.citeQuest(
        crossPool,
        priceRange2.min,
        priceRange2.max,
        1,
        0,
        priceRange2.native
    )

    console.log(
        priceRange,
        priceRange2,
        crossPool.priceToken0,
        crossPool.priceToken1
    )

    expect(priceRange.min).toBeCloseTo(10000, 0) // Min price to buy A with B
    expect(priceRange.max).toBeCloseTo(20000, 0) // Min price to buy A with B

    expect(priceRange2.min).toBeCloseTo(5000, 0) // Min price to buy A with B
    expect(priceRange2.max).toBeCloseTo(10000, 0) // Min price to buy A with B

    expect(crossPool.priceToken0).toBeCloseTo(0.0001044439032484001, 0)
    expect(crossPool.priceToken1).toBeCloseTo(10000, 0)

    expect(crossPool.curPP).toBeCloseTo(p2pp(priceRange.min))

    expect(crossPool.pos.get(p2pp(priceRange.min)).liquidity).toBeCloseTo(
        45068,
        0
    )
    expect(crossPool.pos.get(p2pp(priceRange.max)).liquidity).toBeCloseTo(
        -45068,
        0
    )

    expect(crossPool.pos.get(p2pp(1 / priceRange2.min)).liquidity).toBeCloseTo(
        -0.010001,
        0
    )
    expect(crossPool.pos.get(p2pp(1 / priceRange2.max)).liquidity).toBeCloseTo(
        0.010001,
        0
    )
})

it('Opens positions in both directions with B pool maxed out', () => {
    const investor = Investor.create('investor', 'investor', 100000)
    const questA = investor.createQuest('questA')
    const questB = investor.createQuest('questB')

    const poolA = questA.createPool({ tokenLeft: new UsdcToken() })
    const poolB = questB.createPool({ tokenLeft: new UsdcToken() })

    poolB.buy(1000000000)

    const crossPool = investor.createPool(questB, questA) // base-unit B/A buy (in: B, out: A) sell (in: A out: B)
    const priceRange = investor.calculatePriceRange(crossPool, poolB, poolA, 2) // A citing B (1A in for 10k...20kB)
    investor.citeQuest(
        crossPool,
        priceRange.min,
        priceRange.max,
        0,
        132,
        priceRange.native
    )

    const priceRange2 = investor.calculatePriceRange(crossPool, poolA, poolB, 2) // B citing A (1B in for 0.00005...0.0001A)
    investor.citeQuest(
        crossPool,
        priceRange2.min,
        priceRange2.max,
        1,
        0,
        priceRange2.native
    )

    console.log(
        priceRange,
        priceRange2,
        crossPool.priceToken0,
        crossPool.priceToken1,
        crossPool
    )

    console.log(crossPool.buy(130))
    console.log(crossPool)

    expect(priceRange.min).toBeCloseTo(0.0001, 0) // Min price to buy A with B
    expect(priceRange.max).toBeCloseTo(0.0002, 0) // Min price to buy A with B

    expect(priceRange2.min).toBeCloseTo(0.00005, 0) // Min price to buy A with B
    expect(priceRange2.max).toBeCloseTo(0.0001, 0) // Min price to buy A with B

    expect(crossPool.priceToken0).toBeCloseTo(0.0001044439032484001, 0)
    expect(crossPool.priceToken1).toBeCloseTo(0)

    expect(crossPool.curPP).toBeCloseTo(p2pp(priceRange.min))

    expect(crossPool.pos.get(p2pp(priceRange.min)).liquidity).toBeCloseTo(
        45068,
        0
    )
    expect(crossPool.pos.get(p2pp(priceRange.max)).liquidity).toBeCloseTo(
        -45068,
        0
    )

    expect(crossPool.pos.get(p2pp(1 / priceRange2.min)).liquidity).toBeCloseTo(
        -0.010001,
        0
    )
    expect(crossPool.pos.get(p2pp(1 / priceRange2.max)).liquidity).toBeCloseTo(
        0.010001,
        0
    )
})
