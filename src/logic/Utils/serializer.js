import Investor from '../Investor/Investor.class'
import Pool from '../Pool/Pool.class'
import Token from '../Quest/Token.class'
import UsdcToken from '../Quest/UsdcToken.class'

const _KNOWN_CLASSES = {
    Pool: Pool,
    UsdcToken: UsdcToken,
    Token: Token,
    Investor: Investor
}

/**
 * @description instantiates from assigned Class and rehydrate with functions on prototype
 * @param {*} Cls
 * @param {Object} dataObj
 * @returns {*}
 */
export const rehydrate = (dataObj, Cls) => {
    let instance
    const isKnownClass =
        dataObj.$class && Object.keys(_KNOWN_CLASSES).includes(dataObj.$class)
    if (Cls) {
        instance = new Cls()
    } else if (isKnownClass) {
        instance = new _KNOWN_CLASSES[dataObj.$class]()
    } else {
        instance = {}
        throw new Error('Class unknown')
    }

    for (const prop in dataObj) {
        if (Object.prototype.hasOwnProperty.call(dataObj, prop)) {
            instance[prop] = dataObj[prop]
        }
    }

    return instance
}

export const serialize = (instance, Cls = {}) => {
    const $class = Cls.name || instance.constructor.name

    return JSON.stringify(Object.assign({ $class }, instance))
}

export const deserialize = (jsonStr, Cls) => {
    const dataObj = JSON.parse(jsonStr)
    if (!dataObj) throw new Error('Can not deserialize')

    return rehydrate(dataObj, Cls)
}

// TODO: delete comments and make tests from it
// class PoolExample {
//     propA
//     propB
//
//     constructor() {
//         console.log('constructor(): new PoolExample()')
//     }
//
//     static create(initialA, initialB) {
//         if (!initialA || !initialB) throw new Error('Ta-da-boom!')
//         const pool = new PoolExample()
//         pool.propA = initialA
//         pool.propB = initialB
//
//         console.log('PoolExample.create() =>', pool)
//
//         return pool
//     }
//
//     showPropsAB() {
//         return `${this.propA} + ${this.propB}`
//     }
//
//     setProps(A, B) {
//         this.propA = A
//         this.propB = B
//     }
// }
// console.log('\n ---------- objBefore -------------')
//
// const objBefore = PoolExample.create('A', 'B')
// const snapshot = serialize(objBefore)
// console.log('snapshot', snapshot)
//
// console.log('\n ---------- objAfter deserialized -------------')
// const objAfter = deserialize(snapshot)
//
// console.log('objAfter.showPropsAB()', objAfter.showPropsAB())
// objAfter.setProps('$1', '$2')
// console.log(
//     'objAfter.showPropsAB() after setProps($1,$2)',
//     objAfter.showPropsAB()
// )
//
// console.log('\n---------- otherPool -------------')
//
// const otherPool = PoolExample.create(100, 200)
// console.log('otherPool.showPropsAB()', objAfter.showPropsAB())
// otherPool.setProps('100,000', '200,000')
// console.log(
//     'otherPool.showPropsAB() after setProps(100,000, 200,000)',
//     otherPool.showPropsAB()
// )
//
// console.log('\n---------- plainObject -------------')
// const plainStr = serialize({ a: 1, b: 2 })
// const plainObject = deserialize(plainStr)
// console.log('plainObject.showPropsAB()', objAfter.showPropsAB())
// plainObject.setProps('100,000', '200,000')
// console.log(
//     'plainObject.showPropsAB() after setProps(100,000, 200,000)',
//     plainObject.showPropsAB()
// )
