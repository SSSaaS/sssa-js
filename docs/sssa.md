# SSSA - JavaScript
## Constants
    prime = 115792089237316195423570985008687907853269984665640564039457584007913129639747
        Safe Prime; [bigInt](https://github.com/peterolson/BigInteger.js); not exported

## Functions
    create(minimum, number, raw)
        minimum - number of shares required to recreate the secret
        number - total number of shares to generate
        raw - secret to protect, as a string

        returns shares as an array of base64 strings of variable length
            dependent on the size of the raw secret

    combine(shares)
        shares - array of base64 strings returned by create function

        returns a string of secret
            note: this string can be ill-formatted utf8 potentially, if the
            minimum number of shares was not met
