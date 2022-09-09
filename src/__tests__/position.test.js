import HashMap from 'hashmap'

import Investor from '../logic/Investor/Investor.class'
import Router from '../logic/Router/Router.class'
import { p2pp } from '../logic/Utils/logicUtils'
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
            tokenA: 5000,
            tokenB: null
        },
        {
            priceMin: 20,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: null
        },
        {
            priceMin: 50,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: null
        },
        {
            priceMin: 200,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: null
        }
    ]
    const { pool } = preparePool(20000, 'creator', initialPositions)
    const p20 = pool.pricePoints.get(p2pp(20))
    const p50 = pool.pricePoints.get(p2pp(50))
    const p200 = pool.pricePoints.get(p2pp(200))
    const p10k = pool.pricePoints.get(p2pp(10000))

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
            tokenA: 5000,
            tokenB: 0
        },
        {
            priceMin: 20,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: 0
        },
        {
            priceMin: 50,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: 0
        },
        {
            priceMin: 200,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: 0
        }
    ]
    const { pool, investor, tokenLeft, tokenRight } = preparePool(
        20000,
        'creator',
        initialPositions
    )

    pool.openPosition(10, 1000, 5000)
    const positions = pool.pricePoints.values()
    const p10 = pool.pricePoints.get(p2pp(10))
    const p1k = pool.pricePoints.get(p2pp(1000))

    expect(p10.left).toBeCloseTo(p2pp(1))
    expect(p10.right).toBeCloseTo(p2pp(20))
    expect(p10.liquidity).toBeCloseTo(17568.209)

    expect(p1k.left).toBeCloseTo(p2pp(200))
    expect(p1k.right).toBeCloseTo(p2pp(10000))
    expect(p1k.liquidity).toBeCloseTo(-17568.209)
})

// it('Opens a new position with token B (the other side)', () => {
//     const initialPositions = [
//         {
//             priceMin: 1,
//             priceMax: 10000,
//             tokenA: 5000,
//             tokenB: 0
//         },
//         {
//             priceMin: 20,
//             priceMax: 10000,
//             tokenA: 5000,
//             tokenB: 0
//         },
//         {
//             priceMin: 50,
//             priceMax: 10000,
//             tokenA: 5000,
//             tokenB: 0
//         },
//         {
//             priceMin: 200,
//             priceMax: 10000,
//             tokenA: 5000,
//             tokenB: 0
//         }
//     ]
//     const { pool, investor, tokenLeft, tokenRight } = preparePool(
//         20000,
//         'creator',
//         initialPositions
//     )

//     pool.openPosition(10, 1000, 0, 5000)
//     const p10 = pool.pricePoints.get(p2pp(1 / 1000))
//     const p1k = pool.pricePoints.get(p2pp(1 / 10))

//     expect(p10.liquidity).toBeCloseTo(5163.277)
//     expect(p1k.liquidity).toBeCloseTo(-5163.277)
// })

it('Removes liquidity partially from a position', () => {
    const initialPositions = [
        {
            priceMin: 1,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: 0
        },
        {
            priceMin: 20,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: 0
        },
        {
            priceMin: 50,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: 0
        },
        {
            priceMin: 200,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: 0
        }
    ]
    const { pool, investor, tokenLeft, tokenRight } = preparePool(
        20000,
        'creator',
        initialPositions
    )

    const oldPosition = pool.pricePoints.get(p2pp(50))
    expect(oldPosition.liquidity).toBeCloseTo(38045.566)

    investor.removeLiquidity(pool, 50, 10000, 3000)
    const newPosition = pool.pricePoints.get(p2pp(50))
    expect(newPosition.liquidity).toBeCloseTo(15218.226)
})

it('Deletes fully an open position and removes liquidity', () => {
    const initialPositions = [
        {
            priceMin: 1,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: 0
        },
        {
            priceMin: 20,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: 0
        },
        {
            priceMin: 50,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: 0
        },
        {
            priceMin: 200,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: 0
        }
    ]
    const { pool, investor, tokenLeft, tokenRight } = preparePool(
        20000,
        'creator',
        initialPositions
    )

    const oldPosition = pool.pricePoints.get(p2pp(50))
    expect(oldPosition.liquidity).toBeCloseTo(38045.566)

    investor.removePosition(pool, 50, 10000, 5000)

    const deletedPosition = pool.pricePoints.get(50)
    expect(deletedPosition).toBeUndefined()
})

it('Updates position with new liquidity if already exists', () => {
    const initialPositions = [
        {
            priceMin: 1,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: 0
        },
        {
            priceMin: 20,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: 0
        },
        {
            priceMin: 50,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: 0
        },
        {
            priceMin: 200,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: 0
        }
    ]
    const { pool, investor, tokenLeft, tokenRight } = preparePool(
        20000,
        'creator',
        initialPositions
    )

    const oldPosition = pool.pricePoints.get(p2pp(20))
    expect(oldPosition.liquidity).toBeCloseTo(23407.494)

    pool.openPosition(20, 10000, 5000)
    const newPosition = pool.pricePoints.get(p2pp(20))
    expect(newPosition.liquidity).toBeCloseTo(46814.989)
})

it('Retrieves new balance when removing liquidity', () => {
    const initialPositions = [
        {
            priceMin: 1,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: 0
        },
        {
            priceMin: 20,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: 0
        },
        {
            priceMin: 50,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: 0
        },
        {
            priceMin: 200,
            priceMax: 10000,
            tokenA: 5000,
            tokenB: 0
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
        3000
    )
    investor.addBalance(tokenLeft.name, amountLeft)
    investor.addBalance(tokenRight.name, amountRight)

    expect(investor.balances[tokenLeft.name]).toBe(23000)
})

// it('Does citation according to market value of a token', () => {
//     const creator = new Investor(1, 10000, 'creator')
//     const router = new Router(globalState)

//     const questA = creator.createQuest('TEST_1')
//     const poolA = questA.createPool() // Deposit A
//     globalState.quests.set(poolA.tokenLeft.name, poolA.tokenLeft)
//     globalState.quests.set(questA.name, questA)
//     globalState.pools.set(poolA.name, poolA)
//     router.smartSwap('USDC', 'TEST_1', 50000, 5000)

//     const questB = creator.createQuest('TEST_2')
//     const poolB = questB.createPool() // Deposit B
//     const exPool1 = globalState.quests.get(poolB.tokenLeft.name)
//     exPool1.addPool(poolB)
//     globalState.quests.set(poolB.tokenLeft.name, exPool1)
//     globalState.quests.set(questB.name, questB)
//     globalState.pools.set(poolB.name, poolB)
//     router.smartSwap('USDC', 'TEST_2', 100000, 5000)

//     const questAgora = creator.createQuest('AGORA')
//     const poolAgora = questAgora.createPool() // Deposit AGORA
//     const exPool2 = globalState.quests.get(poolAgora.tokenLeft.name)
//     exPool2.addPool(poolAgora)
//     globalState.quests.set(poolAgora.tokenLeft.name, exPool2)
//     globalState.quests.set(questAgora.name, questAgora)
//     globalState.pools.set(poolAgora.name, poolAgora)

//     const AB = creator.createPool(questB, questA)
//     creator.citeQuest(AB, 0.475, 2.1, 118, 0)
//     globalState.pools.set(AB.name, AB)
// })
