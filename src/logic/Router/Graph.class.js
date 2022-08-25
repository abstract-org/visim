export class Graph {
    constructor() {
        this.adjList = new Map()
    }

    addVertex(v) {
        this.adjList.set(v, [])
    }

    addEdge(v, w) {
        this.adjList.get(v).push(w)
    }

    print() {
        const keys = this.adjList.keys()

        for (const key of keys) {
            const values = this.adjList.get(key)
            let concat = ''

            for (const value of values) {
                concat += `${value} `
            }

            console.log(`${key} -> ${concat}`)
        }
    }
}
