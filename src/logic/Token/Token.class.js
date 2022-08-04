import sha256 from 'crypto-js/sha256';

// per figma mockup with octahedrons, no authors, just investors

export default class Token {
    hash;
    name; // potentially hashing to hash
    //pools[tokenid] including initial usdc pool (using usdc tokenid)
    //LP_positions[] all LP positions created by this token
    
    constructor(name) {
        this.name = name;
        //this.hash = '0x'+sha256(`${name}`);
        
    }
}
