// dependencies
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const sha256 = require('js-sha256');
const https = require('https');

// server
const app = express();
const PORT = process.env.PORT || 8001;

// values
const imageURL = "https://ispy-beta.herokuapp.com";
const burnAddress = "0000000000000000000000000000000000000000000000000000000000000000";

// middleware
app.use(express.static("public"))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// enable CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
})

// get images
let images;
let nextImageIndex = 0
https.get(imageURL + "/images", res => { 
    let data = ''; 
    res.on('data', chunk => data += chunk.toString())
    res.on('end', () => {
        images = JSON.parse(data);
        nextImageIndex = images.length;
        images = images.sort((a, b) => {
            if (a.hash > b.hash) return 1;
            if (a.hash < b.hash) return -1;
            return 0;
        })
    })
})

// insert into image array so that it's sorted by the hash
function insertImage(images, image) {
    for (let i = 0; i < images.length; i++) {
        if (image.hash < images[i].hash) {
            if (i === 0) {
                images.unshift(image)
            } else {
                images.splice(i, 0, image)
            }
            break
        }
        else if (i === images.length - 1) {
            images.push(image)
            break
        }
    }
    if (images.length === 0) images.push(image);
}

// create genesis block
const hash = sha256("genesis");
const genesisBlock = {
    hash: hash,
    time: 0,
    from: "",
    to: "e76111c368681a8c533e31577efe6a58a47439c39165e359a45de69d022e471c",
    amount: 1000000000,
    image: {
        secret: "genesis"
    }
};

// RSA signature util
function formatKey(key) {
    return "-----BEGIN PUBLIC KEY-----\n" + key.replace(/(.{64})/g,"$1\n") + "\n-----END PUBLIC KEY-----";
}

// begin blockchain
const blockchain = [genesisBlock];
const balances = { [genesisBlock.to]: genesisBlock.amount };

app.get("/blockchain", (req, res) => {
    res.json(blockchain)
})

app.post("/transaction", (req, res) => {
    const transaction = req.body;
    transaction.amount = parseInt(transaction.amount);
    transaction.publicKey = transaction.from;
    transaction.from = sha256(transaction.from)

    // validate transaction
    if (
        !balances[transaction.from] ||
        balances[transaction.from] < transaction.amount + 1 ||
        transaction.from === burnAddress
    ) {
        return res.sendStatus(400);
    }

    // validate signature
    const signature = transaction.signature;
    try {
        const verifyOptions = { algorithms: ["RS256"] };
        jwt.verify(signature, formatKey(transaction.publicKey), verifyOptions);
    } catch (err) {
        return res.sendStatus(400);
    }

    // validate data in signature to ensure it wasn't modified
    const decoded = jwt.decode(signature, { complete: true });
    if (
        transaction.publicKey != decoded.payload.from ||
        transaction.to != decoded.payload.to ||
        transaction.amount != decoded.payload.amount
    ) {
        return res.sendStatus(400);
    }

    // load in the newest image data
    https.get(imageURL + "/images/from/" + nextImageIndex, response => { 
        let data = ''; 
        response.on('data', chunk => data += chunk.toString())
        response.on('end', () => {
            const newImages = JSON.parse(data);
            nextImageIndex += newImages.length;
            for (let i = 0; i < newImages.length; i++) {
                insertImage(images, newImages[i])
            }

            // transaction can't be processed without an image
            if (images.length > 0) {
                
                // store current time in transaction
                const currentTime = new Date().getTime(); //NOTE: do we even need times?
                
                // grab previous block in blockchain for hash
                const prevBlock = blockchain[blockchain.length - 1];

                // create hash
                let stringToHash = currentTime;
                stringToHash += transaction.from;
                stringToHash += transaction.to;
                stringToHash += transaction.amount;
                stringToHash += transaction.signature;
                stringToHash += prevBlock.hash;
                const hash = sha256(stringToHash);

                // find correct image in images array
                let image;
                for (let i = 0; i < images.length; i++) {
                    if (hash < images[i].hash) {
                        image = images.splice(i, 1)[0];
                        break
                    }
                    else if (i === images.length - 1) {
                        image = images.pop();
                    }
                }

                // update balances
                balances[transaction.from] -= transaction.amount + 1;
                if (balances[transaction.to]) {
                    balances[transaction.to] += transaction.amount;
                } else {
                    balances[transaction.to] = transaction.amount;
                }

                // properly format transaction as block
                blockchain.push({
                    hash: hash,
                    time: currentTime,
                    from: transaction.from,
                    to: transaction.to,
                    amount: transaction.amount,
                    publicKey: transaction.publicKey,
                    signature: transaction.signature,
                    image: image,
                })

                // successfully end
                return res.sendStatus(200);
            }

            // error if no images left
            return res.sendStatus(500);
        })
    })
})

app.post("/spot", (req, res) => {
    const spot = req.body;
    const blockIndex = parseInt(spot.blockIndex);
    const block = blockchain[blockIndex];
    spot.publicKey = spot.wallet;
    spot.wallet = sha256(spot.wallet);

    // make sure no one else already found secret
    if (!block.image.secret) {

        // validate signature
        try {
            const signature = spot.signature;
            const verifyOptions = { algorithms: ["RS256"] };
            jwt.verify(signature, formatKey(spot.publicKey), verifyOptions);
        } catch (err) {
            return res.sendStatus(400);
        }

        // test if the secret was actually correct
        const testHash = sha256(block.image.url + spot.secret);
        if (testHash === block.image.hash) {     

            // reward spotter with spots
            if (balances[spot.wallet]) {
                balances[spot.wallet] += 1;
            } else {
                balances[spot.wallet] = 1;
            }

            // update blockchain
            block.image.secret = spot.secret;
            block.image.spotter = spot.wallet;
            block.image.publicKey = spot.publicKey;

            return res.sendStatus(200)
        }
    }

    // error
    return res.sendStatus(400)
})

// start server
app.listen(PORT, () => console.log('Server running at localhost:' + PORT))
