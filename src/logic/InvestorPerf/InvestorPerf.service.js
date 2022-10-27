import globalState from '../GlobalState'

const MOCKED_TABLE_DATA = [
    {
        investorName: 'invName1',
        investorType: 'invType',
        initialBalance: 2000.55,
        currentNav: 30000.88,
        tokens: [
            {
                questName: 'RSCH1',
                growthRate: 1.52
            },
            {
                questName: 'RSCH2',
                growthRate: 3.01
            }
        ]
    },
    {
        investorName: 'invName2',
        investorType: 'invType',
        initialBalance: 2000.55,
        currentNav: 34000.88,
        tokens: [
            {
                questName: 'RSCH1',
                growthRate: 1.52
            },
            {
                questName: 'RSCH2',
                growthRate: 3.01
            }
        ]
    },
    {
        investorName: 'invName6',
        investorType: 'invType',
        initialBalance: 2000.55,
        currentNav: 35000.88,
        tokens: [
            {
                questName: 'RSCH1',
                growthRate: 1.52
            },
            {
                questName: 'RSCH2',
                growthRate: 3.01
            }
        ]
    },
    {
        investorName: 'invName7',
        investorType: 'invType',
        initialBalance: 2000.55,
        currentNav: 35000.88,
        tokens: [
            {
                questName: 'RSCH1',
                growthRate: 1.52
            },
            {
                questName: 'RSCH2',
                growthRate: 3.01
            }
        ]
    },
    {
        investorName: 'invName1',
        investorType: 'invType',
        initialBalance: 2000.55,
        currentNav: 30000.88,
        tokens: [
            {
                questName: 'RSCH1',
                growthRate: 1.52
            },
            {
                questName: 'RSCH2',
                growthRate: 3.01
            }
        ]
    },
    {
        investorName: 'invName2',
        investorType: 'invType3',
        initialBalance: 2000.55,
        currentNav: 30000.88,
        tokens: [
            {
                questName: 'RSCH1',
                growthRate: 1.52
            },
            {
                questName: 'RSCH2',
                growthRate: 3.01
            }
        ]
    },
    {
        investorName: 'invName6',
        investorType: 'invType2',
        initialBalance: 2000.55,
        currentNav: 30000.88,
        tokens: [
            {
                questName: 'RSCH1',
                growthRate: 1.52
            },
            {
                questName: 'RSCH2',
                growthRate: 3.01
            }
        ]
    },
    {
        investorName: 'invName7',
        investorType: 'invType2',
        initialBalance: 2000.55,
        currentNav: 30000.88,
        tokens: [
            {
                questName: 'RSCH1',
                growthRate: 1.52
            },
            {
                questName: 'RSCH2',
                growthRate: 3.01
            }
        ]
    }
]

const _getPriceMap = () =>
    globalState.pools
        .values()
        .filter((pool) => pool.isQuest()) // alternatively .filter(pool => pool.tokenLeft ==== 'USDC')
        .reduce(
            (PriceMap, p) => ({
                ...PriceMap,
                [p.tokenRight]: p.curPrice
            }),
            {}
        )

const _calcInvestorNav = (inv) => {
    let invNav = 0
    const priceMap = _getPriceMap()

    Object.entries(inv.balances).forEach(([token, sum]) => {
        if (token === 'USDC') {
            invNav += sum
        } else {
            invNav += priceMap[token] * sum
        }
    })

    return invNav
}

export const aggregateTableData = () =>
    globalState.investors.values().map((inv) => {
        const item = {
            investorName: inv.name,
            investorType: inv.default ? 'defaultType' : inv.type,
            initialBalance: inv.initialBalance,
            currentNav: _calcInvestorNav(inv),
            tokens: []
        }

        item.OK = true

        return item
    })
