// Static/Read-only token for us
export default class UsdcToken {
    name;
    pools = [];

    constructor() {
        this.name = 'USDC';
    }
}