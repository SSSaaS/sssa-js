sssa = require('../sssa.js');

function main() {
    for (var asdf = 0; asdf < 10; asdf++) {
        console.log(sssa.combine(sssa.create(3, 5, "Hello world!")));
    }
}


main();
