import Investor from '../logic/Investor/Investor.class'
import { getQP } from './helpers/getQuestPools'
import { CALCULATE_PRICERANGE_SNAPSHOT } from './resources/calculatePriceRangeSnapshot'

describe('calculatePriceRange()', () => {
    it('Calculates price range when cited token is more expensive', () => {
        const investor = Investor.create('INV', 'INV', 10000)
        const { pool: agoraPool, quest: agoraQuest } = getQP('AGORA')
        const { pool: pra4Pool, quest: pra4Quest } = getQP('Praseodymium (4)')

        const startingPrice = 1
        const agoraPra4Pool = investor.createPool(
            agoraQuest,
            pra4Quest,
            startingPrice
        )

        const calculatePriceRangeSnapshot = CALCULATE_PRICERANGE_SNAPSHOT
        calculatePriceRangeSnapshot.forEach((pact, idx) => {
            let mutatingPool
            switch (pact.pool.name) {
                case 'USDC-AGORA':
                    mutatingPool = agoraPool
                    break

                case 'AGORA-Praseodymium (4)':
                    mutatingPool = agoraPra4Pool
                    break

                case 'USDC-Praseodymium (4)':
                    mutatingPool = pra4Pool
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

            calculatePriceRangeSnapshot[idx].pool = mutatingPool
        })

        console.log(
            investor.calculatePriceRange(agoraPra4Pool, agoraPool, pra4Pool, 2)
        )
    })
})
