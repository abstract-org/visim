import { preparePool } from './helpers/poolManager'
import globalConfig from '../logic/config.global.json'

it('has correct neighbors', () => {
    const { pool, investor, tokenLeft, tokenRight } = preparePool()

    const firstPosition = globalConfig.INITIAL_LIQUIDITY[0]
    expect(pool.pricePoints.get(firstPosition.priceMin).right).toBe(
        globalConfig.INITIAL_LIQUIDITY[1].priceMin
    )

    const lastPosition =
        globalConfig.INITIAL_LIQUIDITY[
            globalConfig.INITIAL_LIQUIDITY.length - 1
        ]
    expect(pool.pricePoints.get(lastPosition.priceMin).right).toBe(
        lastPosition.priceMax
    )
})

it('Initializes with default positions', () => {
    const initialPositions = [
        {
            priceMin: 1,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 20,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 50,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 200,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        }
    ]
    const { pool } = preparePool(20000, 'creator', initialPositions)
    const positions = pool.pricePoints.values()

    expect(positions[2].liquidity).toBeCloseTo(23407.494)
    expect(positions[3].left).toBe(20)
    expect(positions[4].right).toBe(10000)
})

it('Opens a new position and adjusts neighbors', () => {
    const initialPositions = [
        {
            priceMin: 1,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 20,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 50,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 200,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        }
    ]
    const { pool, investor, tokenLeft, tokenRight } = preparePool(
        20000,
        'creator',
        initialPositions
    )

    investor.openPosition(pool, 10, 1000, 5000)
    const positions = pool.pricePoints.values()

    expect(positions[2].liquidity).toBeCloseTo(17568.209)
    expect(positions[6].liquidity).toBeCloseTo(-17568.209)
})

it('Opens a new position with token B (the other side)', () => {
    const initialPositions = [
        {
            priceMin: 1,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 20,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 50,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 200,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        }
    ]
    const { pool, investor, tokenLeft, tokenRight } = preparePool(
        20000,
        'creator',
        initialPositions
    )

    investor.openPosition(pool, 10, 1000, 500, 3333)
    const positions = pool.pricePoints.values()
})

it('Removes liquidity partially from a position', () => {
    const initialPositions = [
        {
            priceMin: 1,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 20,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 50,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 200,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        }
    ]
    const { pool, investor, tokenLeft, tokenRight } = preparePool(
        20000,
        'creator',
        initialPositions
    )

    const oldPosition = pool.pricePoints.get(50)
    expect(oldPosition.liquidity).toBeCloseTo(38045.566)

    investor.removeLiquidity(pool, 50, 10000, 3000)
    const newPosition = pool.pricePoints.get(50)
    expect(newPosition.liquidity).toBeCloseTo(15218.226)
})

it('Deletes fully an open position and removes liquidity', () => {
    const initialPositions = [
        {
            priceMin: 1,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 20,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 50,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 200,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        }
    ]
    const { pool, investor, tokenLeft, tokenRight } = preparePool(
        20000,
        'creator',
        initialPositions
    )

    const oldPosition = pool.pricePoints.get(50)
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
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 20,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 50,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 200,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        }
    ]
    const { pool, investor, tokenLeft, tokenRight } = preparePool(
        20000,
        'creator',
        initialPositions
    )

    const oldPosition = pool.pricePoints.get(20)
    expect(oldPosition.liquidity).toBeCloseTo(23407.494)

    investor.openPosition(pool, 20, 10000, 5000)
    const newPosition = pool.pricePoints.get(20)
    expect(newPosition.liquidity).toBeCloseTo(46814.989)
})

it('Retrieves new balance when removing liquidity', () => {
    const initialPositions = [
        {
            priceMin: 1,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 20,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 50,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
        },
        {
            priceMin: 200,
            priceMax: 10000,
            tokenLeftAmount: 5000,
            tokenRightAmount: 0
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
