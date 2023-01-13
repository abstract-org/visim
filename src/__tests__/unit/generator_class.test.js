import HashMap from 'hashmap'

import Generator from '../../services/generator/Generator.class'

describe('Generator', () => {
    const emptyMap = new HashMap()
    beforeAll(() => {
        jest.spyOn(console, 'assert').mockImplementation(jest.fn())
    })

    describe('getMinAmount()', () => {
        const generator = new Generator(
            emptyMap,
            emptyMap,
            emptyMap,
            emptyMap,
            emptyMap
        )
        it('returns 0 when all params 0', () => {
            const result = generator.getMinAmount(0, 0, 0)

            expect(result).toBe(0)
        })

        it('returns amount when balance and percentage 0', () => {
            const amount = Math.random()
            const result = generator.getMinAmount(0, 0, amount)

            expect(result).toBe(amount)
        })

        it('returns amount when balance = 0', () => {
            const amount = Math.random()
            const percentage = Math.random() * 1000
            const result = generator.getMinAmount(0, percentage, amount)

            expect(result).toBe(amount)
        })

        it('returns amount when percentage = 0', () => {
            const amount = Math.random()
            const balance = Math.random() * 1000
            const result = generator.getMinAmount(balance, 0, amount)

            expect(result).toBe(amount)
        })

        it('returns percentageAmount when amount 0', () => {
            const percentage = Math.random() * 100
            const balance = Math.random() * 1000
            const percentageAmount = (balance / 100) * percentage
            const result = generator.getMinAmount(balance, percentage, 0)

            expect(result).toBeCloseTo(percentageAmount, 9)
        })

        it('returns percentageAmount when amount string 0', () => {
            const percentage = Math.random() * 100
            const balance = Math.random() * 1000
            const percentageAmount = (balance / 100) * percentage
            const result = generator.getMinAmount(balance, percentage, '0')

            expect(result).toBeCloseTo(percentageAmount, 9)
        })

        it('returns percentageAmount when amount undefined', () => {
            const percentage = Math.random() * 100
            const balance = Math.random() * 1000
            const percentageAmount = (balance / 100) * percentage
            const result = generator.getMinAmount(
                balance,
                percentage,
                undefined
            )

            expect(result).toBeCloseTo(percentageAmount, 9)
        })

        it('returns percentageAmount when smaller than amount', () => {
            const percentage = Math.random() * 100
            const balance = Math.random() * 1000
            const percentageAmount = (balance / 100) * percentage
            const result = generator.getMinAmount(
                percentage,
                balance,
                percentageAmount + 1
            )

            expect(result).toBeCloseTo(percentageAmount, 9)
        })

        it('returns amount when smaller than percentageAmount', () => {
            const percentage = Math.random() * 100
            const balance = Math.random() * 1000
            const percentageAmount = (balance / 100) * percentage
            const amount = percentageAmount - 1
            const result = generator.getMinAmount(percentage, balance, amount)

            expect(result).toBe(amount)
        })
    })
})
