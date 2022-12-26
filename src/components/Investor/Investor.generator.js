import { Modules } from '@abstract-org/sdk'

import InvestorTypes from './Investor.types'

export function generateRandomInvestors(amount) {
    const investors = []

    if (amount <= 0) {
        console.error(
            'Provide valid amount of desired investors to be generated'
        )
    }

    for (let i = 0; i < amount; i++) {
        let randomIndex = Math.floor(
            Math.random() * (InvestorTypes.length - 1 - 0 + 1) + 0
        )
        let randomInvestorType = InvestorTypes[randomIndex]

        let newInvestor = Modules.Investor.create(
            randomInvestorType.type,
            randomInvestorType.name,
            randomInvestorType.usdcBalance
        )

        investors.push(newInvestor)
    }

    return investors
}

export function generateDefaultInvestors() {
    const investors = []

    InvestorTypes.forEach((investorType, i) => {
        let newInvestor = Modules.Investor.create(
            investorType.type,
            investorType.name,
            investorType.usdcBalance,
            investorType.default
        )

        investors.push(newInvestor)
    })

    return investors
}
