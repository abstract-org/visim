import sha256 from 'crypto-js/sha256';
import HashMap from 'hashmap';
import Token from '../Token/Token.class';

export default class Investor {
    id;
    hash;
    type;
    balances = {'USDC': 0}; // not like solidity, what's better -> balances here or in tokens
    positions = [];

    constructor(id, usdcBalance = 10000, type = 'creator') {
        this.id = id;
        this.hash = '0x'+sha256(`${id.toString()} + ${type}`);
        this.balances.USDC = usdcBalance;
        this.type = type;
    }

    createQuest(name) {
        return new Token(name);
    }

    addBalance(tokenName, balance) {
        if (!this.balances[tokenName]) {
            this.balances[tokenName] = 0
        }
        
        const preResult = parseFloat((this.balances[tokenName] + balance).toFixed(9))

        if (preResult === 0) {
            this.balances[tokenName] = 0
        } else {
            this.balances[tokenName] += balance
        }
    }
}