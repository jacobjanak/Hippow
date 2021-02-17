// dependencies
const express = require('express');
const bodyParser = require('body-parser');
// const path = require('path');
const sha256 = require('js-sha256');
const https = require('https');

// server
const app = express();
const PORT = 8000;

// middleware
app.use(express.static("public"))
app.use(bodyParser.json({ limit: "50mb" }))
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }))

// get images
let images;
const url = "https://ispy-beta.herokuapp.com/images";
const request = https.request(url, (response) => { 
    let data = ''; 
    response.on('data', chunk => data += chunk.toString())
    response.on('end', () => images = JSON.parse(data)) 
}) 
request.on('error', error => console.log(error))
request.end()

app.get("/image/:index", (req, res) => {
    const index = parseInt(req.params.index);
    console.log(index)
    if (index != NaN) {
        const url = "https://ispy-beta.herokuapp.com/dataURIs/" + index;
        const request = https.request(url, (response) => { 
            let data = ''; 
            response.on('data', chunk => data += chunk.toString())
            response.on('end', () => res.json(JSON.parse(data)))
        }) 
        request.on('error', error => console.log(error))
        request.end()
    } else {
        res.sendStatus(400)
    }
})

// create genesis block
const currentTime = new Date().getTime();
const hash = sha256("genesis");
const genesisBlock = {
    hash: hash,
    time: currentTime,
    from: "",
    to: "bd7723991b474fc53855e88c634860510984d17eb37a06598273de048750596b",
    amount: 1000000,
    image: {
        secret: "genesis"
    }
};

// begin blockchain
const blockchain = [genesisBlock];
app.get("/api/blockchain", (req, res) => {
    res.json(blockchain)
})

app.post("/api/transaction", (req, res) => {
    const transaction = req.body;
    transaction.amount = parseInt(transaction.amount);

    // to do: validate transaction

    // transaction can't be processed without an image
    if (images.length > 0) {
        
        // store current time in transaction
        const currentTime = new Date().getTime();
        
        // grab previous block in blockchain for hash
        const prevBlock = blockchain[blockchain.length - 1];

        // create hash
        let stringToHash = currentTime;
        stringToHash += transaction.from;
        stringToHash += transaction.to;
        stringToHash += transaction.amount;
        stringToHash += prevBlock.hash;
        const hash = sha256(stringToHash);

        // to create id convert first 3 hex digits of hash to decimal
        const idHex = hash.substring(0, 3);
        const transactionId = parseInt(idHex, 16);

        // find correct index of desired image in images array
        // image id should be as close to transaction id as possible without going over
        // if transaction id is less then the smallest image id then use smallest image id
        let imageIndex = images.length - 1;
        for (let i = 0; i < images.length; i++) {
            if (images[i][0].id > transactionId) {
                if (i === 0) {
                    imageIndex = 0;
                    break
                }
                else {
                    imageIndex = i - 1;
                    break
                }
            }
        }

        // remove and store image from images array at specified index
        let image;
        if (images[imageIndex].length > 1) image = images[imageIndex].shift();
        else image = images.splice(imageIndex, 1)[0][0];

        // temp

        // properly format transaction as block
        const block = {
            hash: hash,
            id: transactionId,
            time: currentTime,
            from: transaction.from,
            to: transaction.to,
            amount: transaction.amount,
            image: image,
        };

        // push block to blockchain
        blockchain.push(block)

        // temp
        console.log(blockchain)

        // successfully end
        return res.sendStatus(200);
    }

    // error if no images left
    return res.sendStatus(500);
})

// start server
app.listen(PORT, () => console.log('Server running at localhost:' + PORT))