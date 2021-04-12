// dependencies
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const sha256 = require('js-sha256');
const https = require('https');

// server
const app = express();
const PORT = process.env.PORT || 8001;

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
const url = "https://ispy-beta.herokuapp.com/images";
https.get(url, res => { 
    let data = ''; 
    res.on('data', chunk => data += chunk.toString())
    res.on('end', () => { images = JSON.parse(data); console.log(images) })
})

// create genesis block
const hash = sha256("genesis");
const genesisBlock = {
    hash: hash,
    time: 0,
    from: "",
    to: "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCWSW0fLPOICZJ5E0XCDWDlF+3luR05S7KEO865VCTZu9zG8Fim/uUq01RR9U9OqM3GTUapOGR8ADMSoah86IBYqjL/ZD8ComUK7yI2yyzYcD1suvEHWirym06ET/fgQI/Aqfbta84p/SO+HYXArjPqnegA+Y6XhOaHWLqDZhoexQIDAQAB",
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

app.get("/api/blockchain", (req, res) => {
    res.json(blockchain)
})

app.post("/api/transaction", (req, res) => {
    const transaction = req.body;
    transaction.amount = parseInt(transaction.amount);

    // validate transaction
    if (
        !balances[transaction.from] ||
        balances[transaction.from] < transaction.amount + 1
    ) {
        return res.sendStatus(400);
    }

    // validate signature
    try {
        const signature = transaction.signature;
        const verifyOptions = { algorithms: ["RS256"] };
        jwt.verify(signature, formatKey(transaction.from), verifyOptions);
    } catch (err) {
        return res.sendStatus(400);
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

        // properly format transaction as block
        blockchain.push({
            hash: hash,
            time: currentTime,
            from: transaction.from,
            to: transaction.to,
            amount: transaction.amount,
            signature: transaction.signature,
            image: image,
        })

        // update balances
        balances[transaction.from] -= transaction.amount + 1;
        if (balances[transaction.to]) {
            balances[transaction.to] += transaction.amount;
        } else {
            balances[transaction.to] = transaction.amount;
        }

        // successfully end
        return res.sendStatus(200);
    }

    // error if no images left
    return res.sendStatus(500);
})

app.post("/spot", (req, res) => {
    const spot = req.body;
    const blockIndex = parseInt(spot.blockIndex);
    const block = blockchain[blockIndex];

    // make sure no one else already found secret
    if (!block.image.secret) {

        // validate signature
        try {
            const signature = spot.signature;
            const verifyOptions = { algorithms: ["RS256"] };
            jwt.verify(signature, formatKey(spot.wallet), verifyOptions);
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

            res.sendStatus(200)
        }
    }

    // error
    res.sendStatus(400)
})

// start server
app.listen(PORT, () => console.log('Server running at localhost:' + PORT))
