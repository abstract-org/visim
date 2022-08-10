
import InvestorTypes from './Investor.types';
import Investor from './Investor.class';

export function generateRandomInvestors(amount) {
    const investors = [];

    if (amount <= 0) {
        console.error('Provide valid amount of desired investors to be generated');
    }

    for(let i = 0; i < amount; i++) {
        let randomIndex = Math.floor(Math.random() * ((InvestorTypes.length-1) - 0 +1) + 0);
        let randomInvestorType = InvestorTypes[randomIndex];

        let newInvestor = new Investor(
            i+1,
            randomInvestorType.usdcBalance,
            randomInvestorType.type
        )

        investors.push(newInvestor)
    }

    return investors;
}

export function generateDefaultInvestors() {
    const investors = [];

    InvestorTypes.forEach((investorType, i) => {
        let newInvestor = new Investor(
            i+1,
            investorType.usdcBalance,
            investorType.type
        )

        investors.push(newInvestor);
    });

    return investors;
}