import sha256 from 'crypto-js/sha256';

// per figma mockup with octahedrons, no authors, just investors

export default class Token {
    name;// potentially hashing to hash
    //pools[tokenid] including initial usdc pool (using usdc tokenid)
    //LP_positions[] all LP positions created by this token
    authorHash;
    currentPrice;
    sqrtCurrentPrice;

    constructor(name) {
        this.name = name;
        
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
