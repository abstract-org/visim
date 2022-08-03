import sha256 from 'crypto-js/sha256';

export default class Token {
    hash;
    name;
    authorHash;

    constructor(name, authorHash) {
        this.name = name;
        this.hash = '0x'+sha256(`${name} + ${authorHash}`);
    }
}