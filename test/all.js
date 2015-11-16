(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var bigInt = (function (undefined) {
    "use strict";

    var BASE = 1e7,
        LOG_BASE = 7,
        MAX_INT = 9007199254740992,
        MAX_INT_ARR = smallToArray(MAX_INT),
        LOG_MAX_INT = Math.log(MAX_INT);

    function BigInteger(value, sign) {
        this.value = value;
        this.sign = sign;
        this.isSmall = false;
    }

    function SmallInteger(value) {
        this.value = value;
        this.sign = value < 0;
        this.isSmall = true;
    }

    function isPrecise(n) {
        return -MAX_INT < n && n < MAX_INT;
    }

    function smallToArray(n) { // For performance reasons doesn't reference BASE, need to change this function if BASE changes
        if (n < 1e7)
            return [n];
        if (n < 1e14)
            return [n % 1e7, Math.floor(n / 1e7)];
        return [n % 1e7, Math.floor(n / 1e7) % 1e7, Math.floor(n / 1e14)];
    }

    function arrayToSmall(arr) { // If BASE changes this function may need to change
        trim(arr);
        var length = arr.length;
        if (length < 4 && compareAbs(arr, MAX_INT_ARR) < 0) {
            switch (length) {
                case 0: return 0;
                case 1: return arr[0];
                case 2: return arr[0] + arr[1] * BASE;
                default: return arr[0] + (arr[1] + arr[2] * BASE) * BASE;
            }
        }
        return arr;
    }

    function trim(v) {
        var i = v.length;
        while (v[--i] === 0);
        v.length = i + 1;
    }

    function createArray(length) { // function shamelessly stolen from Yaffle's library https://github.com/Yaffle/BigInteger
        var x = new Array(length);
        var i = -1;
        while (++i < length) {
            x[i] = 0;
        }
        return x;
    }

    function truncate(n) {
        if (n > 0) return Math.floor(n);
        return Math.ceil(n);
    }

    function add(a, b) { // assumes a and b are arrays with a.length >= b.length
        var l_a = a.length,
            l_b = b.length,
            r = new Array(l_a),
            carry = 0,
            base = BASE,
            sum, i;
        for (i = 0; i < l_b; i++) {
            sum = a[i] + b[i] + carry;
            carry = sum >= base ? 1 : 0;
            r[i] = sum - carry * base;
        }
        while (i < l_a) {
            sum = a[i] + carry;
            carry = sum === base ? 1 : 0;
            r[i++] = sum - carry * base;
        }
        if (carry > 0) r.push(carry);
        return r;
    }

    function addAny(a, b) {
        if (a.length >= b.length) return add(a, b);
        return add(b, a);
    }

    function addSmall(a, carry) { // assumes a is array, carry is number with 0 <= carry < MAX_INT
        var l = a.length,
            r = new Array(l),
            base = BASE,
            sum, i;
        for (i = 0; i < l; i++) {
            sum = a[i] - base + carry;
            carry = Math.floor(sum / base);
            r[i] = sum - carry * base;
            carry += 1;
        }
        while (carry > 0) {
            r[i++] = carry % base;
            carry = Math.floor(carry / base);
        }
        return r;
    }

    BigInteger.prototype.add = function (v) {
        var value, n = parseValue(v);
        if (this.sign !== n.sign) {
            return this.subtract(n.negate());
        }
        var a = this.value, b = n.value;
        if (n.isSmall) {
            return new BigInteger(addSmall(a, Math.abs(b)), this.sign);
        }
        return new BigInteger(addAny(a, b), this.sign);
    };
    BigInteger.prototype.plus = BigInteger.prototype.add;

    SmallInteger.prototype.add = function (v) {
        var n = parseValue(v);
        var a = this.value;
        if (a < 0 !== n.sign) {
            return this.subtract(n.negate());
        }
        var b = n.value;
        if (n.isSmall) {
            if (isPrecise(a + b)) return new SmallInteger(a + b);
            b = smallToArray(Math.abs(b));
        }
        return new BigInteger(addSmall(b, Math.abs(a)), a < 0);
    };
    SmallInteger.prototype.plus = SmallInteger.prototype.add;

    function subtract(a, b) { // assumes a and b are arrays with a >= b
        var a_l = a.length,
            b_l = b.length,
            r = new Array(a_l),
            borrow = 0,
            base = BASE,
            i, difference;
        for (i = 0; i < b_l; i++) {
            difference = a[i] - borrow - b[i];
            if (difference < 0) {
                difference += base;
                borrow = 1;
            } else borrow = 0;
            r[i] = difference;
        }
        for (i = b_l; i < a_l; i++) {
            difference = a[i] - borrow;
            if (difference < 0) difference += base;
            else {
                r[i++] = difference;
                break;
            }
            r[i] = difference;
        }
        for (; i < a_l; i++) {
            r[i] = a[i];
        }
        trim(r);
        return r;
    }

    function subtractAny(a, b, sign) {
        var value, isSmall;
        if (compareAbs(a, b) >= 0) {
            value = subtract(a,b);
        } else {
            value = subtract(b, a);
            sign = !sign;
        }
        value = arrayToSmall(value);
        if (typeof value === "number") {
            if (sign) value = -value;
            return new SmallInteger(value);
        }
        return new BigInteger(value, sign);
    }

    function subtractSmall(a, b, sign) { // assumes a is array, b is number with 0 <= b < MAX_INT
        var l = a.length,
            r = new Array(l),
            carry = -b,
            base = BASE,
            i, difference;
        for (i = 0; i < l; i++) {
            difference = a[i] + carry;
            carry = Math.floor(difference / base);
            difference %= base;
            r[i] = difference < 0 ? difference + base : difference;
        }
        r = arrayToSmall(r);
        if (typeof r === "number") {
            if (sign) r = -r;
            return new SmallInteger(r);
        } return new BigInteger(r, sign);
    }

    BigInteger.prototype.subtract = function (v) {
        var n = parseValue(v);
        if (this.sign !== n.sign) {
            return this.add(n.negate());
        }
        var a = this.value, b = n.value;
        if (n.isSmall)
            return subtractSmall(a, Math.abs(b), this.sign);
        return subtractAny(a, b, this.sign);
    };
    BigInteger.prototype.minus = BigInteger.prototype.subtract;

    SmallInteger.prototype.subtract = function (v) {
        var n = parseValue(v);
        var a = this.value;
        if (a < 0 !== n.sign) {
            return this.add(n.negate());
        }
        var b = n.value;
        if (n.isSmall) {
            return new SmallInteger(a - b);
        }
        return subtractSmall(b, Math.abs(a), a >= 0);
    };
    SmallInteger.prototype.minus = SmallInteger.prototype.subtract;

    BigInteger.prototype.negate = function () {
        return new BigInteger(this.value, !this.sign);
    };
    SmallInteger.prototype.negate = function () {
        var sign = this.sign;
        var small = new SmallInteger(-this.value);
        small.sign = !sign;
        return small;
    };

    BigInteger.prototype.abs = function () {
        return new BigInteger(this.value, false);
    };
    SmallInteger.prototype.abs = function () {
        return new SmallInteger(Math.abs(this.value));
    };

    function multiplyLong(a, b) {
        var a_l = a.length,
            b_l = b.length,
            l = a_l + b_l,
            r = createArray(l),
            base = BASE,
            product, carry, i, a_i, b_j;
        for (i = 0; i < a_l; ++i) {
            a_i = a[i];
            for (var j = 0; j < b_l; ++j) {
                b_j = b[j];
                product = a_i * b_j + r[i + j];
                carry = Math.floor(product / base);
                r[i + j] = product - carry * base;
                r[i + j + 1] += carry;
            }
        }
        trim(r);
        return r;
    }

    function multiplySmall(a, b) { // assumes a is array, b is number with |b| < BASE
        var l = a.length,
            r = new Array(l),
            base = BASE,
            carry = 0,
            product, i;
        for (i = 0; i < l; i++) {
            product = a[i] * b + carry;
            carry = Math.floor(product / base);
            r[i] = product - carry * base;
        }
        while (carry > 0) {
            r[i++] = carry % base;
            carry = Math.floor(carry / base);
        }
        return r;
    }

    function shiftLeft(x, n) {
        var r = [];
        while (n-- > 0) r.push(0);
        return r.concat(x);
    }

    function multiplyKaratsuba(x, y) {
        var n = Math.max(x.length, y.length);
        
        if (n <= 400) return multiplyLong(x, y);
        n = Math.ceil(n / 2);

        var b = x.slice(n),
            a = x.slice(0, n),
            d = y.slice(n),
            c = y.slice(0, n);

        var ac = multiplyKaratsuba(a, c),
            bd = multiplyKaratsuba(b, d),
            abcd = multiplyKaratsuba(addAny(a, b), addAny(c, d));

        return addAny(addAny(ac, shiftLeft(subtract(subtract(abcd, ac), bd), n)), shiftLeft(bd, 2 * n));
    }

    BigInteger.prototype.multiply = function (v) {
        var value, n = parseValue(v),
            a = this.value, b = n.value,
            sign = this.sign !== n.sign,
            abs;
        if (n.isSmall) {
            if (b === 0) return CACHE[0];
            if (b === 1) return this;
            if (b === -1) return this.negate();
            abs = Math.abs(b);
            if (abs < BASE) {
                return new BigInteger(multiplySmall(a, abs), sign);
            }
            b = smallToArray(abs);
        }
        if (a.length + b.length > 4000) // Karatsuba is only faster for sufficiently large inputs
            return new BigInteger(multiplyKaratsuba(a, b), sign);
        return new BigInteger(multiplyLong(a, b), sign);
    };

    BigInteger.prototype.times = BigInteger.prototype.multiply;

    function multiplySmallAndArray(a, b, sign) { // a >= 0
        if (a < BASE) {
            return new BigInteger(multiplySmall(b, a), sign);
        }
        return new BigInteger(multiplyLong(b, smallToArray(a)), sign);
    }
    SmallInteger.prototype["_multiplyBySmall"] = function (a) {
            if (isPrecise(a.value * this.value)) {
                return new SmallInteger(a.value * this.value);
            }
            return multiplySmallAndArray(Math.abs(a.value), smallToArray(Math.abs(this.value)), this.sign !== a.sign);
    };
    BigInteger.prototype["_multiplyBySmall"] = function (a) {
            if (a.value === 0) return CACHE[0];
            if (a.value === 1) return this;
            if (a.value === -1) return this.negate();
            return multiplySmallAndArray(Math.abs(a.value), this.value, this.sign !== a.sign);
    };
    SmallInteger.prototype.multiply = function (v) {
        return parseValue(v)["_multiplyBySmall"](this);
    };
    SmallInteger.prototype.times = SmallInteger.prototype.multiply;

    function square(a) {
        var l = a.length,
            r = createArray(l + l),
            base = BASE,
            product, carry, i, a_i, a_j;
        for (i = 0; i < l; i++) {
            a_i = a[i];
            for (var j = 0; j < l; j++) {
                a_j = a[j];
                product = a_i * a_j + r[i + j];
                carry = Math.floor(product / base);
                r[i + j] = product - carry * base;
                r[i + j + 1] += carry;
            }
        }
        trim(r);
        return r;
    }

    BigInteger.prototype.square = function () {
        return new BigInteger(square(this.value), false);
    };

    SmallInteger.prototype.square = function () {
        var value = this.value * this.value;
        if (isPrecise(value)) return new SmallInteger(value);
        return new BigInteger(square(smallToArray(Math.abs(this.value))), false);
    };

    function divMod1(a, b) { // Left over from previous version. Performs faster than divMod2 on smaller input sizes.
        var a_l = a.length,
            b_l = b.length,
            base = BASE,
            result = createArray(b.length),
            divisorMostSignificantDigit = b[b_l - 1],
            // normalization
            lambda = Math.ceil(base / (2 * divisorMostSignificantDigit)),
            remainder = multiplySmall(a, lambda),
            divisor = multiplySmall(b, lambda),
            quotientDigit, shift, carry, borrow, i, l, q;
        if (remainder.length <= a_l) remainder.push(0);
        divisor.push(0);
        divisorMostSignificantDigit = divisor[b_l - 1];
        for (shift = a_l - b_l; shift >= 0; shift--) {
            quotientDigit = base - 1;
            if (remainder[shift + b_l] !== divisorMostSignificantDigit) {
              quotientDigit = Math.floor((remainder[shift + b_l] * base + remainder[shift + b_l - 1]) / divisorMostSignificantDigit);
            }
            // quotientDigit <= base - 1
            carry = 0;
            borrow = 0;
            l = divisor.length;
            for (i = 0; i < l; i++) {
                carry += quotientDigit * divisor[i];
                q = Math.floor(carry / base);
                borrow += remainder[shift + i] - (carry - q * base);
                carry = q;
                if (borrow < 0) {
                    remainder[shift + i] = borrow + base;
                    borrow = -1;
                } else {
                    remainder[shift + i] = borrow;
                    borrow = 0;
                }
            }
            while (borrow !== 0) {
                quotientDigit -= 1;
                carry = 0;
                for (i = 0; i < l; i++) {
                    carry += remainder[shift + i] - base + divisor[i];
                    if (carry < 0) {
                        remainder[shift + i] = carry + base;
                        carry = 0;
                    } else {
                        remainder[shift + i] = carry;
                        carry = 1;
                    }
                }
                borrow += carry;
            }
            result[shift] = quotientDigit;
        }
        // denormalization
        remainder = divModSmall(remainder, lambda)[0];
        return [arrayToSmall(result), arrayToSmall(remainder)];
    }

    function divMod2(a, b) { // Implementation idea shamelessly stolen from Silent Matt's library http://silentmatt.com/biginteger/
        // Performs faster than divMod1 on larger input sizes.
        var a_l = a.length,
            b_l = b.length,
            result = [],
            part = [],
            base = BASE,
            guess, xlen, highx, highy, check;
        while (a_l) {
            part.unshift(a[--a_l]);
            if (compareAbs(part, b) < 0) {
                result.push(0);
                continue;
            }
            xlen = part.length;
            highx = part[xlen - 1] * base + part[xlen - 2];
            highy = b[b_l - 1] * base + b[b_l - 2];
            if (xlen > b_l) {
                highx = (highx + 1) * base;
            }
            guess = Math.ceil(highx / highy);
            do {
                check = multiplySmall(b, guess);
                if (compareAbs(check, part) <= 0) break;
                guess--;
            } while (guess);
            result.push(guess);
            part = subtract(part, check);
        }
        result.reverse();
        return [arrayToSmall(result), arrayToSmall(part)];
    }

    function divModSmall(value, lambda) {
        var length = value.length,
            quotient = createArray(length),
            base = BASE,
            i, q, remainder, divisor;
        remainder = 0;
        for (i = length - 1; i >= 0; --i) {
            divisor = remainder * base + value[i];
            q = truncate(divisor / lambda);
            remainder = divisor - q * lambda;
            quotient[i] = q | 0;
        }
        return [quotient, remainder | 0];
    }

    function divModAny(self, v) {
        var value, n = parseValue(v);
        var a = self.value, b = n.value;
        var quotient;
        if (b === 0) throw new Error("Cannot divide by zero");
        if (self.isSmall) {
            if (n.isSmall) {
                return [new SmallInteger(truncate(a / b)), new SmallInteger(a % b)];
            }
            return [CACHE[0], self];
        }
        if (n.isSmall) {
            if (b === 1) return [self, CACHE[0]];
            if (b == -1) return [self.negate(), CACHE[0]];
            var abs = Math.abs(b);
            if (abs < BASE) {
                value = divModSmall(a, abs);
                quotient = arrayToSmall(value[0]);
                var remainder = value[1];
                if (self.sign) remainder = -remainder;
                if (typeof quotient === "number") {
                    if (self.sign !== n.sign) quotient = -quotient;
                    return [new SmallInteger(quotient), new SmallInteger(remainder)];
                }
                return [new BigInteger(quotient, self.sign !== n.sign), new SmallInteger(remainder)];
            }
            b = smallToArray(abs);
        }
        var comparison = compareAbs(a, b);
        if (comparison === -1) return [CACHE[0], self];
        if (comparison === 0) return [CACHE[self.sign === n.sign ? 1 : -1], CACHE[0]];

        // divMod1 is faster on smaller input sizes
        if (a.length + b.length <= 200)
            value = divMod1(a, b);
        else value = divMod2(a, b);

        quotient = value[0];
        var qSign = self.sign !== n.sign,
            mod = value[1],
            mSign = self.sign;
        if (typeof quotient === "number") {
            if (qSign) quotient = -quotient;
            quotient = new SmallInteger(quotient);
        } else quotient = new BigInteger(quotient, qSign);
        if (typeof mod === "number") {
            if (mSign) mod = -mod;
            mod = new SmallInteger(mod);
        } else mod = new BigInteger(mod, mSign);
        return [quotient, mod];
    }

    BigInteger.prototype.divmod = function (v) {
        var result = divModAny(this, v);
        return {
            quotient: result[0],
            remainder: result[1]
        };
    };
    SmallInteger.prototype.divmod = BigInteger.prototype.divmod;

    BigInteger.prototype.divide = function (v) {
        return divModAny(this, v)[0];
    };
    SmallInteger.prototype.over = SmallInteger.prototype.divide = BigInteger.prototype.over = BigInteger.prototype.divide;

    BigInteger.prototype.mod = function (v) {
        return divModAny(this, v)[1];
    };
    SmallInteger.prototype.remainder = SmallInteger.prototype.mod = BigInteger.prototype.remainder = BigInteger.prototype.mod;

    BigInteger.prototype.pow = function (v) {
        var n = parseValue(v),
            a = this.value,
            b = n.value,
            value, x, y;
        if (b === 0) return CACHE[1];
        if (a === 0) return CACHE[0];
        if (a === 1) return CACHE[1];
        if (a === -1) return n.isEven() ? CACHE[1] : CACHE[-1];
        if (n.sign) {
            return CACHE[0];
        }
        if (!n.isSmall) throw new Error("The exponent " + n.toString() + " is too large.");
        if (this.isSmall) {
            if (isPrecise(value = Math.pow(a, b)))
                return new SmallInteger(truncate(value));
        }
        x = this;
        y = CACHE[1];
        while (true) {
            if (b & 1 === 1) {
                y = y.times(x);
                --b;
            }
            if (b === 0) break;
            b /= 2;
            x = x.square();
        }
        return y;
    };
    SmallInteger.prototype.pow = BigInteger.prototype.pow;

    BigInteger.prototype.modPow = function (exp, mod) {
        exp = parseValue(exp);
        mod = parseValue(mod);
        if (mod.isZero()) throw new Error("Cannot take modPow with modulus 0");
        var r = CACHE[1],
            base = this.mod(mod);
        if (base.isZero()) return CACHE[0];
        while (exp.isPositive()) {
            if (exp.isOdd()) r = r.multiply(base).mod(mod);
            exp = exp.divide(2);
            base = base.square().mod(mod);
        }
        return r;
    };
    SmallInteger.prototype.modPow = BigInteger.prototype.modPow;

    function compareAbs(a, b) {
        if (a.length !== b.length) {
            return a.length > b.length ? 1 : -1;
        }
        for (var i = a.length - 1; i >= 0; i--) {
            if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
        }
        return 0;
    }

    BigInteger.prototype.compareAbs = function (v) {
        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (n.isSmall) return 1;
        return compareAbs(a, b);
    };
    SmallInteger.prototype.compareAbs = function (v) {
        var n = parseValue(v),
            a = Math.abs(this.value),
            b = n.value;
        if (n.isSmall) {
            b = Math.abs(b);
            return a === b ? 0 : a > b ? 1 : -1;
        }
        return -1;
    };

    BigInteger.prototype.compare = function (v) {
        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (this.sign !== n.sign) {
            return n.sign ? 1 : -1;
        }
        if (n.isSmall) {
            return this.sign ? -1 : 1;
        }
        return compareAbs(a, b) * (this.sign ? -1 : 1);
    };
    BigInteger.prototype.compareTo = BigInteger.prototype.compare;

    SmallInteger.prototype.compare = function (v) {
        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (n.isSmall) {
            return a == b ? 0 : a > b ? 1 : -1;
        }
        if (a < 0 !== n.sign) {
            return a < 0 ? -1 : 1;
        }
        return a < 0 ? 1 : -1;
    };
    SmallInteger.prototype.compareTo = SmallInteger.prototype.compare;

    BigInteger.prototype.equals = function (v) {
        return this.compare(v) === 0;
    };
    SmallInteger.prototype.eq = SmallInteger.prototype.equals = BigInteger.prototype.eq = BigInteger.prototype.equals;

    BigInteger.prototype.notEquals = function (v) {
        return this.compare(v) !== 0;
    };
    SmallInteger.prototype.neq = SmallInteger.prototype.notEquals = BigInteger.prototype.neq = BigInteger.prototype.notEquals;

    BigInteger.prototype.greater = function (v) {
        return this.compare(v) > 0;
    };
    SmallInteger.prototype.gt = SmallInteger.prototype.greater = BigInteger.prototype.gt = BigInteger.prototype.greater;

    BigInteger.prototype.lesser = function (v) {
        return this.compare(v) < 0;
    };
    SmallInteger.prototype.lt = SmallInteger.prototype.lesser = BigInteger.prototype.lt = BigInteger.prototype.lesser;

    BigInteger.prototype.greaterOrEquals = function (v) {
        return this.compare(v) >= 0;
    };
    SmallInteger.prototype.geq = SmallInteger.prototype.greaterOrEquals = BigInteger.prototype.geq = BigInteger.prototype.greaterOrEquals;

    BigInteger.prototype.lesserOrEquals = function (v) {
        return this.compare(v) <= 0;
    };
    SmallInteger.prototype.leq = SmallInteger.prototype.lesserOrEquals = BigInteger.prototype.leq = BigInteger.prototype.lesserOrEquals;

    BigInteger.prototype.isEven = function () {
        return (this.value[0] & 1) === 0;
    };
    SmallInteger.prototype.isEven = function () {
        return (this.value & 1) === 0;
    };

    BigInteger.prototype.isOdd = function () {
        return (this.value[0] & 1) === 1;
    };
    SmallInteger.prototype.isOdd = function () {
        return (this.value & 1) === 1;
    };

    BigInteger.prototype.isPositive = function () {
        return !this.sign;
    };
    SmallInteger.prototype.isPositive = function () {
        return this.value > 0;
    };

    BigInteger.prototype.isNegative = function () {
        return this.sign;
    };
    SmallInteger.prototype.isNegative = function () {
        return this.value < 0;
    };

    BigInteger.prototype.isUnit = function () {
        return false;
    };
    SmallInteger.prototype.isUnit = function () {
        return Math.abs(this.value) === 1;
    };

    BigInteger.prototype.isZero = function () {
        return false;
    };
    SmallInteger.prototype.isZero = function () {
        return this.value === 0;
    };
    BigInteger.prototype.isDivisibleBy = function (v) {
        var n = parseValue(v);
        var value = n.value;
        if (value === 0) return false;
        if (value === 1) return true;
        if (value === 2) return this.isEven();
        return this.mod(n).equals(CACHE[0]);
    };
    SmallInteger.prototype.isDivisibleBy = BigInteger.prototype.isDivisibleBy;

    function isBasicPrime(v) {
        var n = v.abs();
        if (n.isUnit()) return false;
        if (n.equals(2) || n.equals(3) || n.equals(5)) return true;
        if (n.isEven() || n.isDivisibleBy(3) || n.isDivisibleBy(5)) return false;
        if (n.lesser(25)) return true;
        // we don't know if it's prime: let the other functions figure it out
    };

    BigInteger.prototype.isPrime = function () {
        var isPrime = isBasicPrime(this);
        if (isPrime !== undefined) return isPrime;
        var n = this.abs(),
            nPrev = n.prev();
        var a = [2, 3, 5, 7, 11, 13, 17, 19],
            b = nPrev,
            d, t, i, x;
        while (b.isEven()) b = b.divide(2);
        for (i = 0; i < a.length; i++) {
            x = bigInt(a[i]).modPow(b, n);
            if (x.equals(CACHE[1]) || x.equals(nPrev)) continue;
            for (t = true, d = b; t && d.lesser(nPrev) ; d = d.multiply(2)) {
                x = x.square().mod(n);
                if (x.equals(nPrev)) t = false;
            }
            if (t) return false;
        }
        return true;
    };
    SmallInteger.prototype.isPrime = BigInteger.prototype.isPrime;

    BigInteger.prototype.isProbablePrime = function (iterations) {
        var isPrime = isBasicPrime(this);
        if (isPrime !== undefined) return isPrime;
        var n = this.abs();
        var t = iterations === undefined ? 5 : iterations;
        // use the Fermat primality test
        for (var i = 0; i < t; i++) {
            var a = bigInt.randBetween(2, n.minus(2));
            if (!a.modPow(n.prev(), n).isUnit()) return false; // definitely composite
        }
        return true; // large chance of being prime
    };
    SmallInteger.prototype.isProbablePrime = BigInteger.prototype.isProbablePrime;

    BigInteger.prototype.next = function () {
        var value = this.value;
        if (this.sign) {
            return subtractSmall(value, 1, this.sign);
        }
        return new BigInteger(addSmall(value, 1), this.sign);
    };
    SmallInteger.prototype.next = function () {
        var value = this.value;
        if (value + 1 < MAX_INT) return new SmallInteger(value + 1);
        return new BigInteger(MAX_INT_ARR, false);
    };

    BigInteger.prototype.prev = function () {
        var value = this.value;
        if (this.sign) {
            return new BigInteger(addSmall(value, 1), true);
        }
        return subtractSmall(value, 1, this.sign);
    };
    SmallInteger.prototype.prev = function () {
        var value = this.value;
        if (value - 1 > -MAX_INT) return new SmallInteger(value - 1);
        return new BigInteger(MAX_INT_ARR, true);
    };

    var powersOfTwo = [1];
    while (powersOfTwo[powersOfTwo.length - 1] <= BASE) powersOfTwo.push(2 * powersOfTwo[powersOfTwo.length - 1]);
    var powers2Length = powersOfTwo.length, highestPower2 = powersOfTwo[powers2Length - 1];

    function shift_isSmall(n) {
        return ((typeof n === "number" || typeof n === "string") && +Math.abs(n) <= BASE) ||
            (n instanceof BigInteger && n.value.length <= 1);
    }

    BigInteger.prototype.shiftLeft = function (n) {
        if (!shift_isSmall(n)) {
            if (n.isNegative()) return this.shiftRight(n.abs());
            return this.times(CACHE[2].pow(n));
        }
        n = +n;
        if (n < 0) return this.shiftRight(-n);
        var result = this;
        while (n >= powers2Length) {
            result = result.multiply(highestPower2);
            n -= powers2Length - 1;
        }
        return result.multiply(powersOfTwo[n]);
    };
    SmallInteger.prototype.shiftLeft = BigInteger.prototype.shiftLeft;

    BigInteger.prototype.shiftRight = function (n) {
        var remQuo;
        if (!shift_isSmall(n)) {
            if (n.isNegative()) return this.shiftLeft(n.abs());
            remQuo = this.divmod(CACHE[2].pow(n));
            return remQuo.remainder.isNegative() ? remQuo.quotient.prev() : remQuo.quotient;
        }
        n = +n;
        if (n < 0) return this.shiftLeft(-n);
        var result = this;
        while (n >= powers2Length) {
            if (result.isZero()) return result;
            remQuo = divModAny(result, highestPower2);
            result = remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
            n -= powers2Length - 1;
        }
        remQuo = divModAny(result, powersOfTwo[n]);
        return remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
    };
    SmallInteger.prototype.shiftRight = BigInteger.prototype.shiftRight;

    function bitwise(x, y, fn) {
        y = parseValue(y);
        var xSign = x.isNegative(), ySign = y.isNegative();
        var xRem = xSign ? x.not() : x,
            yRem = ySign ? y.not() : y;
        var xBits = [], yBits = [];
        var xStop = false, yStop = false;
        while (!xStop || !yStop) {
            if (xRem.isZero()) { // virtual sign extension for simulating two's complement
                xStop = true;
                xBits.push(xSign ? 1 : 0);
            }
            else if (xSign) xBits.push(xRem.isEven() ? 1 : 0); // two's complement for negative numbers
            else xBits.push(xRem.isEven() ? 0 : 1);

            if (yRem.isZero()) {
                yStop = true;
                yBits.push(ySign ? 1 : 0);
            }
            else if (ySign) yBits.push(yRem.isEven() ? 1 : 0);
            else yBits.push(yRem.isEven() ? 0 : 1);

            xRem = xRem.over(2);
            yRem = yRem.over(2);
        }
        var result = [];
        for (var i = 0; i < xBits.length; i++) result.push(fn(xBits[i], yBits[i]));
        var sum = bigInt(result.pop()).negate().times(bigInt(2).pow(result.length));
        while (result.length) {
            sum = sum.add(bigInt(result.pop()).times(bigInt(2).pow(result.length)));
        }
        return sum;
    }

    BigInteger.prototype.not = function () {
        return this.negate().prev();
    };
    SmallInteger.prototype.not = BigInteger.prototype.not;

    BigInteger.prototype.and = function (n) {
        return bitwise(this, n, function (a, b) { return a & b; });
    };
    SmallInteger.prototype.and = BigInteger.prototype.and;

    BigInteger.prototype.or = function (n) {
        return bitwise(this, n, function (a, b) { return a | b; });
    };
    SmallInteger.prototype.or = BigInteger.prototype.or;

    BigInteger.prototype.xor = function (n) {
        return bitwise(this, n, function (a, b) { return a ^ b; });
    };
    SmallInteger.prototype.xor = BigInteger.prototype.xor;

    var LOBMASK_I = 1 << 30, LOBMASK_BI = (BASE & -BASE) * (BASE & -BASE) | LOBMASK_I;
    function roughLOB(n) { // get lowestOneBit (rough)
        // SmallInteger: return Min(lowestOneBit(n), 1 << 30)
        // BigInteger: return Min(lowestOneBit(n), 1 << 14) [BASE=1e7]
        var v = n.value, x = typeof v === "number" ? v | LOBMASK_I : v[0] + v[1] * BASE | LOBMASK_BI;
        return x & -x;
    }

    function max(a, b) {
        a = parseValue(a);
        b = parseValue(b);
        return a.greater(b) ? a : b;
    }
    function min(a,b) {
        a = parseValue(a);
        b = parseValue(b);
        return a.lesser(b) ? a : b;
    }
    function gcd(a, b) {
        a = parseValue(a).abs();
        b = parseValue(b).abs();
        if (a.equals(b)) return a;
        if (a.isZero()) return b;
        if (b.isZero()) return a;
        var c = CACHE[1], d, t;
        while (a.isEven() && b.isEven()) {
            d = Math.min(roughLOB(a), roughLOB(b));
            a = a.divide(d);
            b = b.divide(d);
            c = c.multiply(d);
        }
        while (a.isEven()) {
            a = a.divide(roughLOB(a));
        }
        do {
            while (b.isEven()) {
                b = b.divide(roughLOB(b));
            }
            if (a.greater(b)) {
                t = b; b = a; a = t;
            }
            b = b.subtract(a);
        } while (!b.isZero());
        return c.isUnit() ? a : a.multiply(c);
    }
    function lcm(a, b) {
        a = parseValue(a).abs();
        b = parseValue(b).abs();
        return a.divide(gcd(a, b)).multiply(b);
    }
    function randBetween(a, b) {
        a = parseValue(a);
        b = parseValue(b);
        var low = min(a, b), high = max(a, b);
        var range = high.subtract(low);
        if (range.isSmall) return low.add(Math.round(Math.random() * range));
        var length = range.value.length - 1;
        var result = [], restricted = true;
        for (var i = length; i >= 0; i--) {
            var top = restricted ? range.value[i] : BASE;
            var digit = truncate(Math.random() * top);
            result.unshift(digit);
            if (digit < top) restricted = false;
        }
        result = arrayToSmall(result);
        return low.add(typeof result === "number" ? new SmallInteger(result) : new BigInteger(result, false));
    }
    var parseBase = function (text, base) {
        var val = CACHE[0], pow = CACHE[1],
            length = text.length;
        if (2 <= base && base <= 36) {
            if (length <= LOG_MAX_INT / Math.log(base)) {
                return new SmallInteger(parseInt(text, base));
            }
        }
        base = parseValue(base);
        var digits = [];
        var i;
        var isNegative = text[0] === "-";
        for (i = isNegative ? 1 : 0; i < text.length; i++) {
            var c = text[i].toLowerCase(),
                charCode = c.charCodeAt(0);
            if (48 <= charCode && charCode <= 57) digits.push(parseValue(c));
            else if (97 <= charCode && charCode <= 122) digits.push(parseValue(c.charCodeAt(0) - 87));
            else if (c === "<") {
                var start = i;
                do { i++; } while (text[i] !== ">");
                digits.push(parseValue(text.slice(start + 1, i)));
            }
            else throw new Error(c + " is not a valid character");
        }
        digits.reverse();
        for (i = 0; i < digits.length; i++) {
            val = val.add(digits[i].times(pow));
            pow = pow.times(base);
        }
        return isNegative ? val.negate() : val;
    };

    function stringify(digit) {
        var v = digit.value;
        if (typeof v === "number") v = [v];
        if (v.length === 1 && v[0] <= 36) {
            return "0123456789abcdefghijklmnopqrstuvwxyz".charAt(v[0]);
        }
        return "<" + v + ">";
    }
    function toBase(n, base) {
        base = bigInt(base);
        if (base.isZero()) {
            if (n.isZero()) return "0";
            throw new Error("Cannot convert nonzero numbers to base 0.");
        }
        if (base.equals(-1)) {
            if (n.isZero()) return "0";
            if (n.isNegative()) return new Array(1 - n).join("10");
            return "1" + new Array(+n).join("01");
        }
        var minusSign = "";
        if (n.isNegative() && base.isPositive()) {
            minusSign = "-";
            n = n.abs();
        }
        if (base.equals(1)) {
            if (n.isZero()) return "0";
            return minusSign + new Array(+n + 1).join(1);
        }
        var out = [];
        var left = n, divmod;
        while (left.isNegative() || left.compareAbs(base) >= 0) {
            divmod = left.divmod(base);
            left = divmod.quotient;
            var digit = divmod.remainder;
            if (digit.isNegative()) {
                digit = base.minus(digit).abs();
                left = left.next();
            }
            out.push(stringify(digit));
        }
        out.push(stringify(left));
        return minusSign + out.reverse().join("");
    }

    BigInteger.prototype.toString = function (radix) {
        if (radix === undefined) radix = 10;
        if (radix !== 10) return toBase(this, radix);
        var v = this.value, l = v.length, str = String(v[--l]), zeros = "0000000", digit;
        while (--l >= 0) {
            digit = String(v[l]);
            str += zeros.slice(digit.length) + digit;
        }
        var sign = this.sign ? "-" : "";
        return sign + str;
    };
    SmallInteger.prototype.toString = function (radix) {
        if (radix === undefined) radix = 10;
        if (radix != 10) return toBase(this, radix);
        return String(this.value);
    };

    BigInteger.prototype.valueOf = function () {
        return +this.toString();
    };
    BigInteger.prototype.toJSNumber = BigInteger.prototype.valueOf;

    SmallInteger.prototype.valueOf = function () {
        return this.value;
    };
    SmallInteger.prototype.toJSNumber = SmallInteger.prototype.valueOf;
    
    function parseStringValue(v) {
            if (isPrecise(+v)) {
                var x = +v;
                if (x === truncate(x))
                    return new SmallInteger(x);
                throw "Invalid integer: " + v;
            }
            var sign = v[0] === "-";
            if (sign) v = v.slice(1);
            var split = v.split(/e/i);
            if (split.length > 2) throw new Error("Invalid integer: " + text.join("e"));
            if (split.length === 2) {
                var exp = split[1];
                if (exp[0] === "+") exp = exp.slice(1);
                exp = +exp;
                if (exp !== truncate(exp) || !isPrecise(exp)) throw new Error("Invalid integer: " + exp + " is not a valid exponent.");
                var text = split[0];
                var decimalPlace = text.indexOf(".");
                if (decimalPlace >= 0) {
                    exp -= text.length - decimalPlace;
                    text = text.slice(0, decimalPlace) + text.slice(decimalPlace + 1);
                }
                if (exp < 0) throw new Error("Cannot include negative exponent part for integers");
                text += (new Array(exp + 1)).join("0");
                v = text;
            }
            var isValid = /^([0-9][0-9]*)$/.test(v);
            if (!isValid) throw new Error("Invalid integer: " + v);
            var r = [], max = v.length, l = LOG_BASE, min = max - l;
            while (max > 0) {
                r.push(+v.slice(min, max));
                min -= l;
                if (min < 0) min = 0;
                max -= l;
            }
            trim(r);
            return new BigInteger(r, sign);
    }
    
    function parseNumberValue(v) {
            if (isPrecise(v)) return new SmallInteger(v);
            return parseStringValue(v.toString());
    }

    function parseValue(v) {
        if (typeof v === "number") {
            return parseNumberValue(v);
        }
        if (typeof v === "string") {
            return parseStringValue(v);
        }
        return v;
    }
    // Pre-define numbers in range [-999,999]
    var CACHE = function (v, radix) {
        if (typeof v === "undefined") return CACHE[0];
        if (typeof radix !== "undefined") return +radix === 10 ? parseValue(v) : parseBase(v, radix);
        return parseValue(v);
    };
    for (var i = 0; i < 1000; i++) {
        CACHE[i] = new SmallInteger(i);
        if (i > 0) CACHE[-i] = new SmallInteger(-i);
    }
    // Backwards compatibility
    CACHE.one = CACHE[1];
    CACHE.zero = CACHE[0];
    CACHE.minusOne = CACHE[-1];
    CACHE.max = max;
    CACHE.min = min;
    CACHE.gcd = gcd;
    CACHE.lcm = lcm;
    CACHE.isInstance = function (x) { return x instanceof BigInteger || x instanceof SmallInteger; };
    CACHE.randBetween = randBetween;
    return CACHE;
})();

// Node.js check
if (typeof module !== "undefined" && module.hasOwnProperty("exports")) {
    module.exports = bigInt;
}

},{}],2:[function(require,module,exports){
var window = require('global/window');
var nodeCrypto = require('crypto');

function getRandomValues(buf) {
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(buf);
  }
  else if (typeof window.msCrypto === 'object' && typeof window.msCrypto.getRandomValues === 'function') {
    window.msCrypto.getRandomValues(buf);
  }
  else if (nodeCrypto.randomBytes) {
    if (buf.length > 65536) {
      var e = new Error();
      e.code = 22;
      e.message = 'Failed to execute \'getRandomValues\' on \'Crypto\': The ' +
        'ArrayBufferView\'s byte length (' + buf.length + ') exceeds the ' +
        'number of bytes of entropy available via this API (65536).';
      e.name = 'QuotaExceededError';
      throw e;
    }
    var bytes = nodeCrypto.randomBytes(buf.length);
    buf.set(bytes);
  }
  else {
    throw new Error('No secure random number generator available.');
  }
}

module.exports = getRandomValues;
},{"crypto":10,"global/window":3}],3:[function(require,module,exports){
(function (global){
if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof global !== "undefined") {
    module.exports = global;
} else if (typeof self !== "undefined"){
    module.exports = self;
} else {
    module.exports = {};
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],4:[function(require,module,exports){
arguments[4][3][0].apply(exports,arguments)
},{"dup":3}],5:[function(require,module,exports){
/*! http://mths.be/fromcodepoint v0.2.1 by @mathias */
if (!String.fromCodePoint) {
	(function() {
		var defineProperty = (function() {
			// IE 8 only supports `Object.defineProperty` on DOM elements
			try {
				var object = {};
				var $defineProperty = Object.defineProperty;
				var result = $defineProperty(object, object, object) && $defineProperty;
			} catch(error) {}
			return result;
		}());
		var stringFromCharCode = String.fromCharCode;
		var floor = Math.floor;
		var fromCodePoint = function(_) {
			var MAX_SIZE = 0x4000;
			var codeUnits = [];
			var highSurrogate;
			var lowSurrogate;
			var index = -1;
			var length = arguments.length;
			if (!length) {
				return '';
			}
			var result = '';
			while (++index < length) {
				var codePoint = Number(arguments[index]);
				if (
					!isFinite(codePoint) || // `NaN`, `+Infinity`, or `-Infinity`
					codePoint < 0 || // not a valid Unicode code point
					codePoint > 0x10FFFF || // not a valid Unicode code point
					floor(codePoint) != codePoint // not an integer
				) {
					throw RangeError('Invalid code point: ' + codePoint);
				}
				if (codePoint <= 0xFFFF) { // BMP code point
					codeUnits.push(codePoint);
				} else { // Astral code point; split in surrogate halves
					// http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
					codePoint -= 0x10000;
					highSurrogate = (codePoint >> 10) + 0xD800;
					lowSurrogate = (codePoint % 0x400) + 0xDC00;
					codeUnits.push(highSurrogate, lowSurrogate);
				}
				if (index + 1 == length || codeUnits.length > MAX_SIZE) {
					result += stringFromCharCode.apply(null, codeUnits);
					codeUnits.length = 0;
				}
			}
			return result;
		};
		if (defineProperty) {
			defineProperty(String, 'fromCodePoint', {
				'value': fromCodePoint,
				'configurable': true,
				'writable': true
			});
		} else {
			String.fromCodePoint = fromCodePoint;
		}
	}());
}

},{}],6:[function(require,module,exports){
/*! http://mths.be/codepointat v0.2.0 by @mathias */
if (!String.prototype.codePointAt) {
	(function() {
		'use strict'; // needed to support `apply`/`call` with `undefined`/`null`
		var defineProperty = (function() {
			// IE 8 only supports `Object.defineProperty` on DOM elements
			try {
				var object = {};
				var $defineProperty = Object.defineProperty;
				var result = $defineProperty(object, object, object) && $defineProperty;
			} catch(error) {}
			return result;
		}());
		var codePointAt = function(position) {
			if (this == null) {
				throw TypeError();
			}
			var string = String(this);
			var size = string.length;
			// `ToInteger`
			var index = position ? Number(position) : 0;
			if (index != index) { // better `isNaN`
				index = 0;
			}
			// Account for out-of-bounds indices:
			if (index < 0 || index >= size) {
				return undefined;
			}
			// Get the first code unit
			var first = string.charCodeAt(index);
			var second;
			if ( // check if it’s the start of a surrogate pair
				first >= 0xD800 && first <= 0xDBFF && // high surrogate
				size > index + 1 // there is a next code unit
			) {
				second = string.charCodeAt(index + 1);
				if (second >= 0xDC00 && second <= 0xDFFF) { // low surrogate
					// http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
					return (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
				}
			}
			return first;
		};
		if (defineProperty) {
			defineProperty(String.prototype, 'codePointAt', {
				'value': codePointAt,
				'configurable': true,
				'writable': true
			});
		} else {
			String.prototype.codePointAt = codePointAt;
		}
	}());
}

},{}],7:[function(require,module,exports){
// UTF8 : Manage UTF-8 strings in ArrayBuffers
if(module.require) {
  require('string.fromcodepoint');
  require('string.prototype.codepointat');
}

var UTF8={
  // non UTF8 encoding detection (cf README file for details)
  'isNotUTF8': function(bytes, byteOffset, byteLength) {
    try {
      UTF8.getStringFromBytes(bytes, byteOffset, byteLength, true);
    } catch(e) {
      return true;
    }
    return false;
  },
  // UTF8 decoding functions
  'getCharLength': function(theByte) {
    // 4 bytes encoded char (mask 11110000)
    if(0xF0 == (theByte&0xF0)) {
      return 4;
    // 3 bytes encoded char (mask 11100000)
    } else if(0xE0 == (theByte&0xE0)) {
      return 3;
    // 2 bytes encoded char (mask 11000000)
    } else if(0xC0 == (theByte&0xC0)) {
      return 2;
    // 1 bytes encoded char
    } else if(theByte == (theByte&0x7F)) {
      return 1;
    }
    return 0;
  },
  'getCharCode': function(bytes, byteOffset, charLength) {
    var charCode = 0, mask = '';
    byteOffset = byteOffset || 0;
    // Retrieve charLength if not given
    charLength = charLength || UTF8.getCharLength(bytes[byteOffset]);
    if(charLength == 0) {
      throw new Error(bytes[byteOffset].toString(2)+' is not a significative' +
        ' byte (offset:'+byteOffset+').');
    }
    // Return byte value if charlength is 1
    if(1 === charLength) {
      return bytes[byteOffset];
    }
    // Test UTF8 integrity
    mask = '00000000'.slice(0, charLength) + 1 + '00000000'.slice(charLength + 1);
    if(bytes[byteOffset]&(parseInt(mask, 2))) {
      throw Error('Index ' + byteOffset + ': A ' + charLength + ' bytes' +
        ' encoded char' +' cannot encode the '+(charLength+1)+'th rank bit to 1.');
    }
    // Reading the first byte
    mask='0000'.slice(0,charLength+1)+'11111111'.slice(charLength+1);
    charCode+=(bytes[byteOffset]&parseInt(mask,2))<<((--charLength)*6);
    // Reading the next bytes
    while(charLength) {
      if(0x80!==(bytes[byteOffset+1]&0x80)
        ||0x40===(bytes[byteOffset+1]&0x40)) {
        throw Error('Index '+(byteOffset+1)+': Next bytes of encoded char'
          +' must begin with a "10" bit sequence.');
      }
      charCode += ((bytes[++byteOffset]&0x3F) << ((--charLength) * 6));
    }
    return charCode;
  },
  'getStringFromBytes': function(bytes, byteOffset, byteLength, strict) {
    var charLength, chars = [];
    byteOffset = byteOffset|0;
    byteLength=('number' === typeof byteLength ?
      byteLength :
      bytes.byteLength || bytes.length
    );
    for(; byteOffset < byteLength; byteOffset++) {
      charLength = UTF8.getCharLength(bytes[byteOffset]);
      if(byteOffset + charLength > byteLength) {
        if(strict) {
          throw Error('Index ' + byteOffset + ': Found a ' + charLength +
            ' bytes encoded char declaration but only ' +
            (byteLength - byteOffset) +' bytes are available.');
        }
      } else {
        chars.push(String.fromCodePoint(
          UTF8.getCharCode(bytes, byteOffset, charLength, strict)
        ));
      }
      byteOffset += charLength - 1;
    }
    return chars.join('');
  },
  // UTF8 encoding functions
  'getBytesForCharCode': function(charCode) {
    if(charCode < 128) {
      return 1;
    } else if(charCode < 2048) {
      return 2;
    } else if(charCode < 65536) {
      return 3;
    } else if(charCode < 2097152) {
      return 4;
    }
    throw new Error('CharCode '+charCode+' cannot be encoded with UTF8.');
  },
  'setBytesFromCharCode': function(charCode, bytes, byteOffset, neededBytes) {
    charCode = charCode|0;
    bytes = bytes || [];
    byteOffset = byteOffset|0;
    neededBytes = neededBytes || UTF8.getBytesForCharCode(charCode);
    // Setting the charCode as it to bytes if the byte length is 1
    if(1 == neededBytes) {
      bytes[byteOffset] = charCode;
    } else {
      // Computing the first byte
      bytes[byteOffset++] =
        (parseInt('1111'.slice(0, neededBytes), 2) << 8 - neededBytes) +
        (charCode >>> ((--neededBytes) * 6));
      // Computing next bytes
      for(;neededBytes>0;) {
        bytes[byteOffset++] = ((charCode>>>((--neededBytes) * 6))&0x3F)|0x80;
      }
    }
    return bytes;
  },
  'setBytesFromString': function(string, bytes, byteOffset, byteLength, strict) {
    string = string || '';
    bytes = bytes || [];
    byteOffset = byteOffset|0;
    byteLength = ('number' === typeof byteLength ?
      byteLength :
      bytes.byteLength||Infinity
    );
    for(var i = 0, j = string.length; i < j; i++) {
      var neededBytes = UTF8.getBytesForCharCode(string[i].codePointAt(0));
      if(strict && byteOffset + neededBytes > byteLength) {
        throw new Error('Not enought bytes to encode the char "' + string[i] +
          '" at the offset "' + byteOffset + '".');
      }
      UTF8.setBytesFromCharCode(string[i].codePointAt(0),
        bytes, byteOffset, neededBytes, strict);
      byteOffset += neededBytes;
    }
    return bytes;
  }
};

if('undefined' !== typeof module) {
  module.exports = UTF8;
}


},{"string.fromcodepoint":5,"string.prototype.codepointat":6}],8:[function(require,module,exports){
(function (global){
if (typeof require === "function") {
    var bigInt = require("big-integer");
    var getRandomValues = require('get-random-values');
    var UTF8 = require('utf-8');
    var window = require('global/window');

    /*
     * Implements base64 decode and encode in browser that
     * it hasn't support of window.btoa and window.atob
     * methods.
     * Based in Nick Galbreath
     * http://code.google.com/p/stringencoders/source/browse/#svn/
     * and Carlo Zottmann jQuery port
     * http://github.com/carlo/jquery-base64
     * Adapted by SeViR in DIGIO
     */

    if (!window.atob && !window.btoa){
     ( function( window ) {
        var _PADCHAR = "=",
          _ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

        function _getbyte64( s, i ) {
          var idx = _ALPHA.indexOf( s.charAt( i ) );

          if ( idx === -1 ) {
            throw "Cannot decode base64";
          }

          return idx;
        }

        function _decode( s ) {
          var pads = 0,
            i,
            b10,
            imax = s.length,
            x = [];

          s = String( s );

          if ( imax === 0 ) {
            return s;
          }

          if ( imax % 4 !== 0 ) {
            throw "Cannot decode base64";
          }

          if ( s.charAt( imax - 1 ) === _PADCHAR ) {
            pads = 1;

            if ( s.charAt( imax - 2 ) === _PADCHAR ) {
              pads = 2;
            }

            // either way, we want to ignore this last block
            imax -= 4;
          }

          for ( i = 0; i < imax; i += 4 ) {
            b10 = ( _getbyte64( s, i ) << 18 ) | ( _getbyte64( s, i + 1 ) << 12 ) | ( _getbyte64( s, i + 2 ) << 6 ) | _getbyte64( s, i + 3 );
            x.push( String.fromCharCode( b10 >> 16, ( b10 >> 8 ) & 0xff, b10 & 0xff ) );
          }

          switch ( pads ) {
            case 1:
              b10 = ( _getbyte64( s, i ) << 18 ) | ( _getbyte64( s, i + 1 ) << 12 ) | ( _getbyte64( s, i + 2 ) << 6 );
              x.push( String.fromCharCode( b10 >> 16, ( b10 >> 8 ) & 0xff ) );
              break;

            case 2:
              b10 = ( _getbyte64( s, i ) << 18) | ( _getbyte64( s, i + 1 ) << 12 );
              x.push( String.fromCharCode( b10 >> 16 ) );
              break;
          }

          return x.join( "" );
        }

        function _getbyte( s, i ) {
          var x = s.charCodeAt( i );

          if ( x > 255 ) {
            throw "INVALID_CHARACTER_ERR: DOM Exception 5";
          }

          return x;
        }

        function _encode( s ) {
          if ( arguments.length !== 1 ) {
            throw "SyntaxError: exactly one argument required";
          }

          s = String( s );

          var i,
            b10,
            x = [],
            imax = s.length - s.length % 3;

          if ( s.length === 0 ) {
            return s;
          }

          for ( i = 0; i < imax; i += 3 ) {
            b10 = ( _getbyte( s, i ) << 16 ) | ( _getbyte( s, i + 1 ) << 8 ) | _getbyte( s, i + 2 );
            x.push( _ALPHA.charAt( b10 >> 18 ) );
            x.push( _ALPHA.charAt( ( b10 >> 12 ) & 0x3F ) );
            x.push( _ALPHA.charAt( ( b10 >> 6 ) & 0x3f ) );
            x.push( _ALPHA.charAt( b10 & 0x3f ) );
          }

          switch ( s.length - imax ) {
            case 1:
              b10 = _getbyte( s, i ) << 16;
              x.push( _ALPHA.charAt( b10 >> 18 ) + _ALPHA.charAt( ( b10 >> 12 ) & 0x3F ) + _PADCHAR + _PADCHAR );
              break;

            case 2:
              b10 = ( _getbyte( s, i ) << 16 ) | ( _getbyte( s, i + 1 ) << 8 );
              x.push( _ALPHA.charAt( b10 >> 18 ) + _ALPHA.charAt( ( b10 >> 12 ) & 0x3F ) + _ALPHA.charAt( ( b10 >> 6 ) & 0x3f ) + _PADCHAR );
              break;
          }

          return x.join( "" );
        }

        window.btoa = _encode;
        window.atob = _decode;

      })( window );
    }
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
            i = 1;

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

        for (i = 0; i < hex_data.length/2; i++) {
            result += String.fromCharCode(parseInt(hex_data.substring(i*2, (i+1)*2), 16));
        }

        return btoa(result).replace(/\//g, '_').replace(/\+/g, '-');
    }

    function from_base64(number) {
        var bytes = atob(number.replace(/_/g, '/').replace(/-/g, '+')),
            hex_data = "",
            temp = "",
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

var sssa = _sssa;
module.exports = sssa;

if (typeof global.testing !== "undefined" && global.testing === true) {
    global._sssa_utils = _sssa_utils;
    global._sssa = _sssa;
}

_sssa = undefined;
_sssa_utils = undefined;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"big-integer":1,"get-random-values":2,"global/window":4,"utf-8":7}],9:[function(require,module,exports){
(function (global){
require('global');

global.testing = true;
sssa = require('../sssa.js');
bigInt = require('big-integer');

function logger(text) {
    if (typeof document === "undefined") {
        console.log(text);
    } else {
        document.write(text + "<br>");
    }
}

function assertEqual(actual, expected) {
    if (typeof actual === typeof bigInt(0)) {
        if (actual.compare(expected) !== 0) {
            logger("Assert error: " + actual.toString() + " !== " + expected.toString());
            return false;
        }
    } else {
        if (actual !== expected) {
            logger("Assert error: " + actual + " !== " + expected);
            return false;
        }
    }

    return true;
}

function main() {
    var utils = global._sssa_utils;

    var tests = [
        function() {
            var start = new Date();

            for (var i = 0; i < 10000; i++) {
                var result = assertEqual(utils.random() < utils.prime, true);
                if (!result) {
                    logger("Test failed: TestRandom");
                    return false;
                }
            }

            var end = new Date();
            logger("ok @ TestRandom in " + ((end.getTime() - start.getTime())/1000) + "s");
            return true;
        },

        function() {
            var start = new Date();

            for (var i = 0; i < 10000; i++) {
                var value = utils.random();

                var result = assertEqual(utils.from_base64(utils.to_base64(value)), value);
                if (!result) {
                    logger("Test failed: TestBaseConversion");
                    return false;
                }
            }

            var end = new Date();
            logger("ok @ TestBaseConversion in " + ((end.getTime() - start.getTime())/1000) + "s");
            return true;
        },

        function() {
            var start = new Date();

            for (var i = 0; i < 10000; i++) {
                var value = utils.random();

                var result = assertEqual(utils.to_base64(value).length, 44);
                if (!result) {
                    logger("Test failed: TestToBase64");
                    return false;
                }
            }

            var end = new Date();
            logger("ok @ TestToBase64 in " + ((end.getTime() - start.getTime())/1000) + "s");
            return true;
        },

        function() {
            var start = new Date();

            var values = ["N17FigASkL6p1EOgJhRaIquQLGvYV0", "0y10VAfmyH7GLQY6QccCSLKJi8iFgpcSBTLyYOGbiYPqOpStAf1OYuzEBzZR", "KjRHO1nHmIDidf6fKvsiXWcTqNYo2U9U8juO94EHXVqgearRISTQe0zAjkeUYYBvtcB8VWzZHYm6ktMlhOXXCfRFhbJzBUsXaHb5UDQAvs2GKy6yq0mnp8gCj98ksDlUultqygybYyHvjqR7D7EAWIKPKUVz4of8OzSjZlYg7YtCUMYhwQDryESiYabFID1PKBfKn5WSGgJBIsDw5g2HB2AqC1r3K8GboDN616Swo6qjvSFbseeETCYDB3ikS7uiK67ErIULNqVjf7IKoOaooEhQACmZ5HdWpr34tstg18rO"];

            for (var index in values) {
                var result = assertEqual(utils.merge_ints(utils.split_ints(values[index])), values[index]);
                if (!result) {
                    logger("Test failed: TestSplitMerge");
                    return false;
                }
            }

            var end = new Date();
            logger("ok @ TestSplitMerge in " + ((end.getTime() - start.getTime())/1000) + "s");
            return true;
        },

        function() {
            var start = new Date();

            var values = ["a\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00a", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa哈囉世界", "こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界こんにちは、世界"];
            for (var index in values) {
                var result = assertEqual(utils.merge_ints(utils.split_ints(values[index])), values[index]);
                if (!result) {
                    logger("Test failed: TestSplitMergeOdds");
                    return false;
                }
            }

            var end = new Date();
            logger("ok @ TestSplitMergeOdds in " + ((end.getTime() - start.getTime())/1000) + "s");
            return true;
        },

        function() {
            var start = new Date();

            for (var i = 0; i < 10000; i++) {
                var value = utils.random();
                var inverse = utils.mod_inverse(value);
                var actual = value.multiply(inverse).mod(utils.prime).add(utils.prime).mod(utils.prime);

                var result = assertEqual(actual, bigInt(1));
                if (!result) {
                    logger("Test failed: TestModInverse");
                    return false;
                }
            }

            var end = new Date();
            logger("ok @ TestModInverse in " + ((end.getTime() - start.getTime())/1000) + "s");
            return true;
        },

        function() {
            var start = new Date();

            var values = [[[bigInt(20), bigInt(21), bigInt(42)], bigInt(0)], [[bigInt(0), bigInt(0), bigInt(0)], bigInt(4)], [[bigInt(1), bigInt(2), bigInt(3), bigInt(4), bigInt(5)], bigInt(10)]];
            var actual = [bigInt(20), bigInt(0), bigInt(54321)];

            for (var index in values) {
                var result = assertEqual(utils.evaluate_polynomial(values[index][0], values[index][1]), actual[index]);
                if (!result) {
                    logger("Test failed: TestEvaluatePolynomial");
                    return false;
                }
            }

            var end = new Date();
            logger("ok @ TestEvaluatePolynomial in " + ((end.getTime() - start.getTime())/1000) + "s");
            return true;
        },

        function() {
            var start = new Date();

            var values = ["N17FigASkL6p1EOgJhRaIquQLGvYV0", "0y10VAfmyH7GLQY6QccCSLKJi8iFgpcSBTLyYOGbiYPqOpStAf1OYuzEBzZR", "KjRHO1nHmIDidf6fKvsiXWcTqNYo2U9U8juO94EHXVqgearRISTQe0zAjkeUYYBvtcB8VWzZHYm6ktMlhOXXCfRFhbJzBUsXaHb5UDQAvs2GKy6yq0mnp8gCj98ksDlUultqygybYyHvjqR7D7EAWIKPKUVz4of8OzSjZlYg7YtCUMYhwQDryESiYabFID1PKBfKn5WSGgJBIsDw5g2HB2AqC1r3K8GboDN616Swo6qjvSFbseeETCYDB3ikS7uiK67ErIULNqVjf7IKoOaooEhQACmZ5HdWpr34tstg18rO"],
                minimum = [4, 6, 20],
                shares = [5, 100, 100];

            for (var index in values) {
                var result = assertEqual(sssa.combine(sssa.create(minimum[index], shares[index], values[index])), values[index]);
                if (!result) {
                    logger("Test failed: TestCreateCombine");
                    return false;
                }
            }

            var end = new Date();
            logger("ok @ TestCreateCombine in " + ((end.getTime() - start.getTime())/1000) + "s");
            return true;
        },

        function() {
            var start = new Date();

            var shares = ["U1k9koNN67-og3ZY3Mmikeyj4gEFwK4HXDSglM8i_xc=yA3eU4_XYcJP0ijD63Tvqu1gklhBV32tu8cHPZXP-bk=", "O7c_iMBaGmQQE_uU0XRCPQwhfLBdlc6jseTzK_qN-1s=ICDGdloemG50X5GxteWWVZD3EGuxXST4UfZcek_teng=", "8qzYpjk7lmB7cRkOl6-7srVTKNYHuqUO2WO31Y0j1Tw=-g6srNoWkZTBqrKA2cMCA-6jxZiZv25rvbrCUWVHb5g=", "wGXxa_7FPFSVqdo26VKdgFxqVVWXNfwSDQyFmCh2e5w=8bTrIEs0e5FeiaXcIBaGwtGFxeyNtCG4R883tS3MsZ0=", "j8-Y4_7CJvL8aHxc8WMMhP_K2TEsOkxIHb7hBcwIBOo=T5-EOvAlzGMogdPawv3oK88rrygYFza3KSki2q8WEgs="];
            var result = assertEqual(sssa.combine(shares), "test-pass");

            if (!result) {
                logger("Test failed: TestLibraryCombine");
                return false;
            }
            var end = new Date();

            logger("ok @ TestLibraryCombine in " + ((end.getTime() - start.getTime())/1000) + "s");
            return true;
        }
    ];

    for (var i in tests) {
        if (!tests[i]()) {
            return false;
        }
    }
}

main();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../sssa.js":8,"big-integer":1,"global":4}],10:[function(require,module,exports){

},{}]},{},[9]);
