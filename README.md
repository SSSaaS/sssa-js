# sssa-js
[![Build Status](https://travis-ci.org/SSSaaS/sssa-js.svg?branch=master)](https://travis-ci.org/SSSaaS/sssa-js)

An implementation of Shamir's Secret Sharing Algorithm in JavaScript
Currently working in Firefox, Chrome, Safari, Opera, Edge,
and Node.js v0.11 or later.

    Copyright (C) 2015 Alexander Scheel, Joel May, Matthew Burket  
    See Contributors.md for a complete list of contributors.  
    Licensed under the MIT License.  

## Usage
Note: this library is for a pure implementation of SSS in JavaScript;
if you are looking for the API Library for SSSaaS, look [here](https://github.com/SSSAAS/sssaas-js).

    sssa.create(minimum, shares, raw) - creates a set of shares

    sssa.combine(shares) - combines shares into secret

For more detailed documentation, check out docs/sssa.md.

To use in a browser, use either `sssa.js` with browserify or use the pre-built
`sssa-min.js`.

## Contributing
We welcome pull requests, issues, security advice on this library, or other contributions you feel are necessary. Feel free to open an issue to discuss any questions you have about this library.

To develop; `npm install` will install the necessary dependencies. After making
changes, please update the minified and testing bundles:

    browserify ./sssa.js > sssa-base.js &&  uglifyjs --compress -- ./sssa-base.js > sssa-min.js && rm ./sssa-base.js && browserify ./test/sssa.js > ./test/all.js

The reference implementation for this cross-language project was written in Go, [here](https://github.com/SSSAAS/sssa-golang).
Please make sure all tests pass before submitting a pull request. In particular,
`node ./tests/sssa.js` and loading `tests/testing.html` in available browsers
after rebuilding all.js with browserify via `browserify ./tests/sssa.js > ./tests/all.js`
will run all internal tests and the [go-libtest](https://github.com/SSSAAS/go-libtest) suite's
tests should be run against the changes before submission.

For security issues, send a GPG-encrypted email to <alexander.m.scheel@gmail.com> with public key [0xBDC5F518A973035E](https://pgp.mit.edu/pks/lookup?op=vindex&search=0xBDC5F518A973035E).
