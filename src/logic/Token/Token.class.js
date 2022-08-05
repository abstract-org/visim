import sha256 from 'crypto-js/sha256';

export default class Token {
    hash;
    name;
    authorHash;
    currentPrice;
    sqrtCurrentPrice;

    constructor(name, authorHash) {
        this.name = name;
        this.hash = '0x'+sha256(`${name} + ${authorHash}`);
    }

    setPrice(price) {
        this.currentPrice = price;
        this.sqrtCurrentPrice = Math.sqrt(this.currentPrice)
    }

    setSqrtPrice(sqrtPrice) {
        this.sqrtCurrentPrice = sqrtPrice;
        this.price = this.sqrtCurrentPrice ** 2;
    }

    getPrice() {
        return this.currentPrice;
    }

    getSqrtPrice() {
        return this.sqrtCurrentPrice;
    }
}