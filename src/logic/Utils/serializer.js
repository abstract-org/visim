import HashMap from 'hashmap'

import Investor from '../Investor/Investor.class'
import Pool from '../Pool/Pool.class'
import Token from '../Quest/Token.class'
import UsdcToken from '../Quest/UsdcToken.class'
import { isNumericString } from './logicUtils'

const _KNOWN_CLASSES = {
    Pool: Pool,
    UsdcToken: UsdcToken,
    Token: Token,
    Investor: Investor
}

/**
 * @description instantiates from assigned Class and rehydrate with functions and HashMaps
 * @param {*} Cls
 * @param {Object} dataObj
 * @returns {*}
 */
const rehydrate = (dataObj, Cls) => {
    let instance
    const isKnownClass =
        dataObj &&
        dataObj.$class &&
        Object.keys(_KNOWN_CLASSES).includes(dataObj.$class)
    if (Cls) {
        instance = new Cls()
    } else if (isKnownClass) {
        instance = new _KNOWN_CLASSES[dataObj.$class]()
    } else {
        throw new Error('Can not rehydrate - class unknown')
    }

    if (instance) {
        for (const prop in dataObj) {
            if (Object.prototype.hasOwnProperty.call(dataObj, prop)) {
                instance[prop] = dataObj[prop]
            }
        }
        delete instance.$class
    }

    return instance
}
const hashMapToObjectReducer = (ResultObj, [k, v]) => {
    const itemClass = v.constructor && v.constructor.name
    const preparedItem = { ...v, $class: itemClass }

    return { ...ResultObj, [k]: preparedItem }
}

const hashMapToObject = (hashMap) =>
    hashMap.entries().reduce(hashMapToObjectReducer, { $class: 'HashMap' })

const _replacer = (key, value) => {
    if (value instanceof HashMap) {
        return hashMapToObject(value)
    } else if (
        value instanceof Pool ||
        value instanceof Token ||
        value instanceof UsdcToken ||
        value instanceof Investor
    ) {
        console.log('replacer', value.constructor.name, value)
        return Object.assign({ $class: value.constructor.name }, value)
    }

    switch (value) {
        case Infinity:
            return 'Infinity'
        case -Infinity:
            return '-Infinity'
        default:
            return value
    }
}

const serialize = (instance) => {
    const $class = instance.constructor.name

    return JSON.stringify(Object.assign({ $class }, instance), _replacer)
}

const convertObjToHashMap = (obj) => {
    // converting { [string]: value } ==> [ [string1,value1], [string2,value2] ]
    const objEntriesConverted = Object.entries(obj).reduce((Arr2D, [k, v]) => {
        const newKey = isNumericString(k) ? parseFloat(k) : k

        return [...Arr2D, [newKey, v]]
    }, [])
    return new HashMap(objEntriesConverted)
}

const _reviverWithHashMaps = (key, value) => {
    const valueClass = value && value.$class
    if (valueClass === 'HashMap') {
        delete value.$class

        return convertObjToHashMap(value)
    } else if (valueClass === 'Object') {
        delete value.$class
    }

    switch (value) {
        case 'Infinity':
            return Infinity
        case '-Infinity':
            return -Infinity
        default:
            return value
    }
}

export const deserialize = (jsonStr) => {
    return JSON.parse(jsonStr, _reviverWithHashMaps)
}

const Serializer = {
    serialize,
    deserialize,
    rehydrate,
    hashMapToObjectReducer
}

export default Serializer

// // TODO: delete comments and make tests from it
// class PoolExample {
//     propA
//     propB
//     positions = new HashMap()
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
//         return (
//             '\n | PropA = ' +
//             this.propA +
//             '\n | PropB = ' +
//             this.propB +
//             '\n | positions.values() = ' +
//             this.positions.values()
//         )
//     }
//
//     setProps(A, B) {
//         this.propA = A
//         this.propB = B
//         this.positions.set('propA', this.propA)
//         this.positions.set('propB', this.propB)
//     }
// }
//
// const _KNOWN_CLASSES = {
//     PoolExample: PoolExample
// }
//
//
// console.log('\n ---------- objBefore -------------')
//
// const objBefore = PoolExample.create('A', 'B')
// objBefore.setProps('A', 'B')
// const snapshot = serialize(objBefore)
// console.log('snapshot = ', snapshot)
//
// console.log('\n ---------- objAfter deserialized -------------')
// const objAfter = rehydrate(deserialize(snapshot), PoolExample)
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
// console.log('\n---------- plainObject -------------')
// const plainStr = serialize({ a: 1, b: 2 })
// const plainObject = deserialize(plainStr)
// console.log('plainObject.showPropsAB()', objAfter.showPropsAB())
// plainObject.setProps('100,000', '200,000')
// console.log(
//     'plainObject.showPropsAB() after setProps(100,000, 200,000)',
//     plainObject.showPropsAB()
// )
