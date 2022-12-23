/**
 * @description Downloads big state files in chunk using HTTP range
 * @param {string} stateLocation
 * @returns {{}|globalState}
 */
export const downloadStateFrom = async (stateLocation) => {
    const buffer = await download({
        stateLocation,
        chunkSize: 1 * 1024 * 1024,
        poolLimit: 6
    })

    const base64 = new TextDecoder().decode(buffer)

    return base64
}

const download = async ({ stateLocation, chunkSize, poolLimit = 1 }) => {
    const contentLength = await getContentLength(stateLocation)
    const chunks =
        typeof chunkSize === 'number' ? Math.ceil(contentLength / chunkSize) : 1

    const results = await asyncPool(
        poolLimit,
        [...new Array(chunks).keys()],
        (i) => {
            let start = i * chunkSize
            let end =
                i + 1 === chunks ? contentLength - 1 : (i + 1) * chunkSize - 1
            return getBinaryContent(stateLocation, start, end, i)
        }
    )

    const sortedBuffers = results.map((item) => new Uint8Array(item.buffer))
    return concatenate(sortedBuffers)
}

export const getContentLength = async (url) => {
    const result = await fetch(url, {
        method: 'HEAD'
    })

    if (result.headers.has('content-length')) {
        return result.headers.get('content-length')
    }

    return 0
}

const asyncPool = async (concurrency, iterable, iteratorFn) => {
    const ret = [] // Store all asynchronous tasks
    const executing = new Set() // Stores executing asynchronous tasks
    for (const item of iterable) {
        // Call the iteratorFn function to create an asynchronous task
        const p = Promise.resolve().then(async () => iteratorFn(item, iterable))

        ret.push(p) // save new async task
        executing.add(p) // Save an executing asynchronous task

        const clean = () => executing.delete(p)
        p.then(clean).catch(clean)
        if (executing.size >= concurrency) {
            // Wait for faster task execution to complete
            await Promise.race(executing)
        }
    }
    return Promise.all(ret)
}

const getBinaryContent = async (url, start, end, i) => {
    return new Promise((resolve, reject) => {
        try {
            let xhr = new XMLHttpRequest()
            xhr.open('GET', url, true)
            xhr.setRequestHeader('range', `bytes=${start}-${end}`) // Set range request information
            xhr.responseType = 'arraybuffer' // Set the returned type to arraybuffer
            xhr.onload = function () {
                resolve({
                    index: i, // file block index
                    buffer: xhr.response
                })
            }
            xhr.send()
        } catch (err) {
            reject(new Error(err))
        }
    })
}

const concatenate = (arrays) => {
    if (!arrays.length) return null
    let totalLength = arrays.reduce((acc, value) => acc + value.length, 0)
    let result = new Uint8Array(totalLength)
    let length = 0
    for (let array of arrays) {
        result.set(array, length)
        length += array.length
    }
    return result
}
