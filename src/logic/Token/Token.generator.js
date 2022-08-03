import Token from "./Token.class";

// We can generate Tokens, if we need to...
export default function generateToken(name) {
    return new Token(name);
}