import { MathUtils } from '@abstract-org/sdk'

import { watcherGetCitations, watcherGetSwaps } from '../../utils/watcher'

const {
    buySameLiqGiveT0GetT1,
    buySameLiqGiveT1GetT0,
    getBuySameLiq,
    getSellSameLiq,
    getSwapAmtSameLiq,
    oneShotGetBuyCap,
    oneShotGetSellCap,
    sellSameLiqGiveT0GetT1,
    sellSameLiqGiveT1GetT0
} = MathUtils

/**
 * @description Expose internal functions to the browser for interactive debugging
 */
export const api = {
    buySameLiqGiveT0GetT1,
    buySameLiqGiveT1GetT0,
    getBuySameLiq,
    getSellSameLiq,
    getSwapAmtSameLiq,
    oneShotGetBuyCap,
    oneShotGetSellCap,
    sellSameLiqGiveT0GetT1,
    sellSameLiqGiveT1GetT0,
    watcherGetCitations,
    watcherGetSwaps,
    _methods: () => {
        var res = []
        for (var m in api) {
            if (typeof api[m] == 'function' && api[m] !== '_methods') {
                res.push(m)
            }
        }
        return res
    }
}
