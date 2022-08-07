import sha256 from 'crypto-js/sha256';
import HashMap from 'hashmap';
import Token from '../Token/Token.class';

export default class Investor {
    id;
    hash;
    type;
    balances = {'USDC': 0}; // not like solidity, what's better -> balances here or in tokens
    positions = [];

    #canBuy = true;
    #canSell = true;
    #canCreate = true;

    constructor(id, usdcBalance = 10000, type = 'creator', canCreate) {
        this.id = id;
        this.hash = '0x'+sha256(`${id.toString()} + ${type}`);
        this.balances.USDC = usdcBalance;
        this.type = type;
        this.#canCreate = canCreate;
    }

    createToken(name) {
        if (!this.#canCreate) return undefined;

        return new Token(name);
    }
}