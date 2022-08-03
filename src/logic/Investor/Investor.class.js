import sha256 from 'crypto-js/sha256';

export default class Investor {
    id;
    hash;
    type;
    balances = {'USDC': 0};
    injectedUSDC = 0;
    withdrawnUSDC = 0;
    positions = new Map();
    walletHash;

    #canBuy = true;
    #canSell = true;
    #canCreate = true;

    constructor(id, usdcBalance = 10000, type = 'creator', canCreate) {
        this.id = id;
        this.hash = '0x'+sha256(`${id.toString()} + ${usdcBalance.toString()} + ${type}`);
        this.balances.USDC = usdcBalance;
        this.type = type;
        this.#canCreate = canCreate;
    }
}