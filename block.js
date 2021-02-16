const sha256 = require('js-sha256');


class Block {
    constructor(prevBlock, image, transaction) {

        // store transaction details
        this.time = new Date().getTime();
        this.from = transaction.from;
        this.to = transaction.to;
        this.amount = transaction.amount;

        // add image to block which contains secret word
        this.image = image;
        this.image.dataURI = ""; // temp

        // create new hash
        const hash = sha256.create();
        const stringToHash = "" + this.time + this.from + this.to + this.amount + this.image.hash;
        if (prevBlock) {

            // get previous hash to ensure continuity
            const prevHash = prevBlock.hash;
            hash.update(prevHash + stringToHash);

        // special case for genesis block
        } else hash.update("Hello world" + stringToHash);
        
        // store hash
        this.hash = hash.hex();
    }
}

module.exports = Block;
