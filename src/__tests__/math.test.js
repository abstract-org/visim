describe('Uniswap Math formulas', () => {
    it('constant product value is maintained when trading', () => {
        const x = 2000
        const y = 300
        const k1 = x * y

        const dx = 500
        const dy = (y * dx) / (x + dx)
        const k2 = (x + dx) * (y - dy)

        expect(k1).toBe(k2)
    })

    it('K is higher when new liquidity added', () => {
        const x = 5000
        const y = 200
        const k = x * y

        const dx = 500
        const dy = 20

        const k2 = (x + dx) * (y * dy)

        expect(k2).toBeGreaterThan(k)
    })

    it('What is dy for dx?', () => {
        const x = 5000
        const y = 200

        const dx = 500
        const dy = (y * dx) / x

        expect(dy).toBe(20)
    })

    it('Existing price is equal to the new to be added liquidity size', () => {
        const x = 5000
        const y = 200

        const dx = 246
        const dy = (y * dx) / x

        expect(dx / dy).toBe(x / y)
    })

    it("price doesn't change when new liquidity added", () => {
        const x = 1000
        const y = 250

        const dx = 100
        const dy = (y * dx) / x

        const p = x / y
        const px = (x + dx) / (y + dy)

        expect(p).toEqual(px)
    })

    it('calculate L of x', () => {
        const x = 5000
        const Pa = 1
        const Pb = 10000
        const Lx =
            x *
            ((Math.sqrt(Pa) * Math.sqrt(Pb)) / (Math.sqrt(Pb) - Math.sqrt(Pa)))

        expect(Lx).toBeCloseTo(5050.505)
    })

    it('calculate L of y', () => {
        const y = 5000
        const Pa = 1
        const Pb = 10000
        const Ly = y / (Math.sqrt(Pb) - Math.sqrt(Pa))

        expect(Ly).toBeCloseTo(50.505)
    })

    it('calculate L of x and y', () => {
        const x = 5000
        const y = 5000
        const Px = 1
        const Py = 10000
        const Pa = 1
        const Pb = 10000

        const Lx =
            x *
            ((Math.sqrt(Px) * Math.sqrt(Pb)) / (Math.sqrt(Pb) - Math.sqrt(Px)))
        const Ly = y / (Math.sqrt(Py) - Math.sqrt(Pa))

        expect(Lx).toBeCloseTo(5050.505)
        expect(Ly).toBeCloseTo(50.505)
    })

    it('calculate liquidity current-implementation', () => {
        const amount0 = 0
        const amount1 = 5000
        const P = 1
        const Pa = 1
        const Pb = 10000
        const liquidity0 = amount1 / (1 / Math.sqrt(Pa) - 1 / Math.sqrt(Pb))
        const liquidity1 = amount0 / (Math.sqrt(P) - Math.sqrt(Pa))

        expect(liquidity0).toBeCloseTo(5050.505)
        expect(liquidity1).toBe(NaN)
    })
})
