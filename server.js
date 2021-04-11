// dependencies
const express = require('express');
const bodyParser = require('body-parser');
// const path = require('path');
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
const request = https.request(url, (response) => { 
    let data = ''; 
    response.on('data', chunk => data += chunk.toString())
    response.on('end', () => { images = JSON.parse(data); }) 
})

// create genesis block
const hash = sha256("genesis");
const genesisBlock = {
    hash: hash,
    time: 0,
    from: "",
    to: "d8f90747cafcd65366c66ab9a6264889e90e21cf72786ed040b7f4c32ecb942c",
    amount: 1000000000,
    image: {
        secret: "genesis"
    }
};

// begin blockchain
const blockchain = [genesisBlock];
const balances = { [genesisBlock.to]: genesisBlock.amount };

app.get("/api/blockchain", (req, res) => {
    res.json(blockchain)
})

app.post("/api/transaction", (req, res) => {
    const transaction = req.body;
    transaction.amount = parseInt(transaction.amount);

    // validate signature
    // signature proves that the sender has the private key
    const verifyOptions = { algorithms: ["RS256"] };
    const verified = jwt.verify(token, publicKey, verifyOptions);
    console.log("\n Verified: " + JSON.stringify(verified));
    const decoded = jwt.decode(token, {complete: true});
    console.log(decoded)

    // validate transaction
    if (
        !balances[transaction.from] ||
        balances[transaction.from] < transaction.amount + 1
    ) {
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

    // test if the secret was actually correct
    const testHash = sha256(block.image.url + spot.secret);
    if (testHash === block.image.hash) {
        block.image.secret = spot.secret;
        block.image.spotter = spot.wallet;
        res.sendStatus(200)
    } else {
        res.sendStatus(400)
    }
})

// start server
app.listen(PORT, () => console.log('Server running at localhost:' + PORT))
