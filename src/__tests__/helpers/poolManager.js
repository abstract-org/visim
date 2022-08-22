import Investor from '../../logic/Investor/Investor.class'
import UsdcToken from '../../logic/Quest/UsdcToken.class'
import globalConfig from '../../logic/config.global.json'

export const preparePool = (
    initialSum = 35000,
    investorType = 'creator',
    initialPositions
) => {
    const investor = new Investor(1, initialSum, investorType)
    const tokenRight = investor.createQuest('RP1')
    const tokenLeft = new UsdcToken()
    const pool = tokenRight.createPool(tokenLeft)

    if (!initialPositions) {
        initialPositions = globalConfig.INITIAL_LIQUIDITY
    }

    tokenRight.addPool(pool)
    tokenRight.initializePoolPositions(pool, initialPositions)

    initialPositions.forEach((position) => {
        investor.addBalance(tokenLeft.name, -position.tokenLeftAmount)
    })

    return { pool, investor, tokenLeft, tokenRight }
}
