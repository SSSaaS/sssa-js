if (typeof require === "function") {
    var bigInt = require("big-integer");
    var getRandomValues = require('get-random-values');
    var UTF8 = require('utf-8');
}

var _sssa_utils = (function (root) {
    var prime = bigInt("115792089237316195423570985008687907853269984665640564039457584007913129639747");

    function random() {
        var bytes = new Uint8Array(32),
            string = "",
            i = 0;

        getRandomValues(bytes)
        for (i in bytes) {
            string += Array((2 - bytes[i].toString(16).length) + 1).join(0) + bytes[i].toString(16);
        }

        return bigInt(string, 16);
    }

    function split_ints(secrets) {
        var result = [],
            working = [],
            i = 0,
            hex_data = "";

        working = UTF8.setBytesFromString(secrets);

        for (i in working) {
            hex_data += Array((2 - working[i].toString(16).length) + 1).join(0) + working[i].toString(16);
        }

        for (i = 0; i < hex_data.length/64; i++) {
            if ((i+1)*64 < hex_data.length) {
                result[i] = bigInt(hex_data.substring(i*64, (i+1)*64), 16);
            } else {
                result[i] = bigInt(hex_data.substring(i*64) + Array(((i+1)*64 - hex_data.length)+1).join(0), 16);
            }
        }

        return result;
    }

    function merge_ints(secrets) {
        var hex_data = "",
            bytes = [],
            temp = "",
            i = 0;

        for (i in secrets) {
            temp = secrets[i].toString(16);
            temp = Array(64 - temp.length + 1).join(0) + temp;
            hex_data += temp;
        }

        hex_data = hex_data.replace(/(00){1,}$/, '');

        for (i = 0; i < hex_data.length/2; i++) {
            bytes.push(parseInt(hex_data.substring(i*2, (i+1)*2), 16));
        }

        return UTF8.getStringFromBytes(bytes);
    }

    function evaluate_polynomial(coefficients, value) {
        var result = bigInt(coefficients[0]),
            i = 1,
            tmp = bigInt(0);

        for (i = 1; i < coefficients.length; i++) {
            result = result.add(value.pow(i, prime).mod(prime).add(prime).mod(prime).multiply(coefficients[i]).mod(prime).add(prime).mod(prime));
        }

        return result.mod(prime);
    }

    function to_base64(number) {
        var hex_data = number.toString(16),
            result = "",
            i = 0;

        hex_data = Array(64 - hex_data.length + 1).join('0') + hex_data;

        console.log(hex_data.length);

        for (i = 0; i < hex_data.length/2; i++) {
            result += String.fromCharCode(parseInt(hex_data.substring(i*2, (i+1)*2), 16));
        }

        return btoa(result).replace(/\//g, '_').replace(/\+/g, '-');
    }

    function from_base64(number) {
        var bytes = atob(number.replace(/_/g, '/').replace(/-/g, '+')),
            hex_data = "",
            tmp = "",
            i = 0;

        for (i = 0; i < bytes.length; i++) {
            temp = bytes.charCodeAt(i).toString(16);
            temp = Array(2 - (temp.length % 3) + 1).join(0) + temp;
            hex_data += temp;
        }

        hex_data = hex_data.replace(/^(00){1,}/, '');

        return bigInt(hex_data, 16);
    }

    function gcd(a, b) {
        var n = bigInt(0),
            c = bigInt(0),
            r = bigInt(0);

        if (b.compare(bigInt(0)) == 0) {
            return [a, bigInt(1), bigInt(0)];
        }

        n = a.divmod(b).quotient;
        c = a.mod(b).add(b).mod(b);
        r = gcd(b, c);

        return [r[0], r[2], r[1].subtract(r[2].multiply(n))];
    }

    function mod_inverse(number) {
        var value = gcd(prime, number.mod(prime));
        var remainder = value[2];

        if (number.compare(0) == -1) {
            remainder = remainder.multiply(-1);
        }

        return remainder.mod(prime).add(prime).mod(prime);
    }

    return {
        'prime': prime,
        'random': random,
        'split_ints': split_ints,
        'merge_ints': merge_ints,
        'evaluate_polynomial': evaluate_polynomial,
        'to_base64': to_base64,
        'from_base64': from_base64,
        'gcd': gcd,
        'mod_inverse': mod_inverse,
    }
}(this));

var _sssa = (function(root) {
    var utils = _sssa_utils;

    function create(minimum, shares, raw) {
        if (minimum > shares) {
            return;
        }

        var secret = utils.split_ints(raw),
            numbers = [bigInt(0)],
            polynomial = [],
            result = [],
            i = 0,
            j = 1;

        for (i in secret) {
            polynomial.push([secret[i]]);
            for (j = 1; j < minimum; j++) {
                value = utils.random();
                while (value in numbers) {
                    value = utils.random();
                }
                numbers.push(value);

                polynomial[i].push(value);
            }
        }


        for (i = 0; i < shares; i++) {
            for (j in secret) {
                value = utils.random();
                while (value in numbers) {
                    value = utils.random();
                }
                numbers.push(value);

                if (typeof result[i] !== typeof "string") {
                    result[i] = "";
                }

                result[i] += utils.to_base64(value);
                result[i] += utils.to_base64(utils.evaluate_polynomial(polynomial[j], value));
            }
        }

        return result;
    }

    function combine(shares) {
        var secrets = [],
            share = "",
            count = 0,
            cshare = "",
            secret = [],
            origin = bigInt(0),
            originy = bigInt(0),
            numerator = bigInt(1),
            denominator = bigInt(1),
            i = 0,
            j = 0,
            k = 0;

        for (i in shares) {
            if (shares[i].length % 88 != 0) {
                return;
            }

            share = shares[i];
            count = share.length / 88;
            secrets[i] = [];

            for (j = 0; j < count; j++) {
                cshare = share.substring(j*88, (j+1)*88);
                secrets[i][j] = [utils.from_base64(cshare.substring(0, 44)), utils.from_base64(cshare.substring(44))];
            }
        }

        for (j = 0; j < secrets[0].length; j++) {
            secret[j] = bigInt(0);
            for (i in secrets) {
                origin = secrets[i][j][0];
                originy = secrets[i][j][1];
                numerator = bigInt(1);
                denominator = bigInt(1);

                for (k in secrets) {
                    if (k !== i) {
                        numerator = numerator.multiply(secrets[k][j][0].multiply(-1)).mod(utils.prime).add(utils.prime).mod(utils.prime);
                        denominator = denominator.multiply(origin.subtract(secrets[k][j][0])).mod(utils.prime).add(utils.prime).mod(utils.prime);
                    }
                }

                secret[j] = secret[j].add(originy.multiply(numerator).mod(utils.prime).add(utils.prime).mod(utils.prime).multiply(utils.mod_inverse(denominator)).mod(utils.prime).add(utils.prime).mod(utils.prime)).mod(utils.prime).add(utils.prime).mod(utils.prime);
            }
        }

        return utils.merge_ints(secret);
    }

    return sssa = {
        'create': create,
        'combine': combine
    };
}(this));

// Node.js check
if (typeof module !== "undefined" && module.hasOwnProperty("exports")) {
    var sssa = _sssa;
    module.exports = sssa;
} else {
    sssa = _sssa;
}

if (typeof testing === "undefined" || testing == false) {
    _sssa = undefined;
    _sssa_utils = undefined;
}
