it('constant product value is maintained when trading', () => {
    const x = 2000
    const y = 300
    const k1 = x*y

    const dx = 500
    const dy = y*dx/(x+dx)
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
    const dy = y*dx/x

    expect(dy).toBe(20)
})

it('Existing price is equal to the new to be added liquidity size', () => {
    const x = 5000
    const y = 200

    const dx = 246
    const dy = y*dx/x

    expect(dx/dy).toBe(x/y)
})


it('price doesn\'t change when new liquidity added', () => {
    const x = 1000
    const y = 250

    const dx = 100
    const dy = y*dx/x
    
    const p = x/y
    const px = (x+dx)/(y+dy)

    expect(p).toEqual(px)
})

it('calculate liquidity of x and y', () => {
    const x = 5000
    const y = 20000
    const L = Math.sqrt(x*y)
})