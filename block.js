const sha256 = require('js-sha256');


class Block {
    constructor(blockchain, images, from, to, amount) {

        // store transaction details
        this.time = new Date().getTime();
        this.from = from;
        this.to = to;
        this.amount = amount;

        // add image to block which contains secret word
        this.image = images[blockchain.length];
        this.image.dataURI = ""; // temp

        // create new hash
        const hash = sha256.create();
        const stringToHash = "" + this.time + this.from + this.to + this.amount + this.image.hash;
        if (blockchain.length > 0) {

            // get previous hash to ensure continuity
            const prevBlock = blockchain[blockchain.length - 1];
            const prevHash = prevBlock.hash;
            hash.update(prevHash + stringToHash);

        // special case for genesis block
        } else hash.update("Hello world" + stringToHash);
        
        // store hash
        this.hash = hash.hex();
    }
}

module.exports = Block;
