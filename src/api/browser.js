import {
    buySameLiqGiveT0GetT1,
    buySameLiqGiveT1GetT0,
    getBuySameLiq,
    getSellSameLiq,
    getSwapAmtSameLiq,
    oneShotGetBuyCap,
    oneShotGetSellCap,
    sellSameLiqGiveT0GetT1,
    sellSameLiqGiveT1GetT0
} from '../logic/Router/math'

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
