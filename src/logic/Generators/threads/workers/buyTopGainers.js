import * as Comlink from 'comlink'

const worker = {
    counter: 0,
    add(a, b) {
        this.counter = a + b
    }
}

Comlink.expose(worker)
