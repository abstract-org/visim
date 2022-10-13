import * as Comlink from 'comlink'

const tradeTopGainers = async () => {
    const wrk = new Worker('./workers/buyTopGainers.js')
    const worker = Comlink.wrap(wrk)

    console.log('Result worker', worker.counter)
    await worker.add(2, 2)
    console.log('Result worker', worker.counter)
}

export default tradeTopGainers
