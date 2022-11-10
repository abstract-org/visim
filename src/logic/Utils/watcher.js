const watcherState = {
    citations: [],
    swaps: []
}

export const watcherStore = (
    watchType,
    tokenName,
    amountDesired,
    amountActual
) => {
    watcherState[watchType].push({
        tokenName,
        amountDesired,
        amountActual
    })
}

export const watcherGetCitations = (shouldLogRaw) => {
    if (shouldLogRaw) {
        console.log(watcherState.citations)
    }

    return watcherAggregate(watcherState.citations)
}

export const watcherGetSwaps = (shouldLogRaw) => {
    if (shouldLogRaw) {
        console.log(watcherState.citations)
    }

    return watcherAggregate(watcherState.swaps)
}

const watcherAggregate = (watches) => {
    const aggregateAmounts = {}

    watches.forEach((citeObj) => {
        if (!aggregateAmounts[citeObj.tokenName]) {
            aggregateAmounts[citeObj.tokenName] = {
                amountDesired: 0,
                amountActual: 0
            }
        }

        aggregateAmounts[citeObj.tokenName].amountDesired += Math.abs(
            citeObj.amountDesired
        )
        aggregateAmounts[citeObj.tokenName].amountActual += Math.abs(
            citeObj.amountActual
        )
    })

    return aggregateAmounts
}
