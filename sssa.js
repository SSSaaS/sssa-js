if (typeof require === "function") {
    var bigInt = require("big-integer");
    var getRandomValues = require('get-random-values');
    var UTF8 = require('utf-8');
} else {

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

    return {
        'random': random,
        'split_ints': split_ints,
        'merge_ints': merge_ints,
    }
}(this));

var _sssa = (function(root) {
    console.log(_sssa_utils);
    var utils = _sssa_utils;

    function create(minimum, shares, raw) {
        if (minimum < shares) {
            return;
        }

        var secret = utils.split_int(raw),
            numbers = [bigInt(0)],
            polynomial = [],
            result = [],
            i = 0,
            j = 1;

        for (i in secret) {
            polynomial.push([secret[i]]);
            for (j = 1; j < minimum; j++) {
                value = util.random();
                while (value in numbers) {
                    value = util.random();
                }
                numbers.push(value);

                polynomial[i].push(value);
            }
        }

        for (i = 0; i < shares; i++) {
            for (j in secret) {
                value = util.random();
                while (value in numbers) {
                    value = util.random();
                }
                numbers.push(value);

                if (typeof result[i] !== typeof "string") {
                    result[i] = "";
                } else {
                    result[i] += utils.to_base64(value);
                    result[i] += utils.to_base64(utils.evaluate_polynomial(polynomial[j], value));
                }
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
                        numerator = numerator.multiply(secrets[k][j][0].multiply(-1)).mod(utils.prime);
                        denominator = denominator.multiply(origin.subtract(secrets[k][j][0])).mod(utils.prime);
                    }
                }

                secret[j] = secret[j].add(originy.multiply(numerator).mod(utils.prime).multiply(denominator).mod(utils.prime)).mod(utils.prime);
            }
        }

        return utils.merge_int(secret);
    }

    return sssa = {
        'create': create,
        'combine': combine
    };
}(this));

// Node.js check
if (typeof module !== "undefined" && module.hasOwnProperty("exports")) {
    module.exports = _sssa;
} else {
    sssa = _sssa;
}
