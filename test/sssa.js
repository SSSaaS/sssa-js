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
