export default [
    {
        type: 'creator',
        usdcBalance: 10000,
        canCreate: true,
        dailySummonChance: 10
    },
    {
        type: 'long-term',
        usdcBalance: 1000000,
        canCreate: false,
        dailySummonChance: 3
    },
    {
        type: 'fomo',
        usdcBalance: 1000,
        canCreate: false,
        dailySummonChance: 50
    }
]