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
// let lastImageDataURI; // keep track of only most recent image data URI
const url = "https://ispy-beta.herokuapp.com/images";
const request = https.request(url, (response) => { 
    let data = ''; 
    response.on('data', chunk => data += chunk.toString())
    response.on('end', () => { images = JSON.parse(data); console.log(images) }) 
}) 
request.on('error', error => console.log(error))
request.end(() => {
    // const url = "https://ispy-beta.herokuapp.com/dataURIs/0";
    // const request = https.request(url, (response) => { 
    //     let data = ''; 
    //     response.on('data', chunk => data += chunk.toString())
    //     response.on('end', () => lastImageDataURI = JSON.parse(data))
    // }) 
    // request.on('error', error => console.log(error))
    // request.end()
})

// app.get("/image/:index", (req, res) => {
//     const index = parseInt(req.params.index);
//     if (index != NaN) {
//         const url = "https://ispy-beta.herokuapp.com/dataURIs/" + index;
//         const request = https.request(url, (response) => { 
//             let data = ''; 
//             response.on('data', chunk => data += chunk.toString())
//             response.on('end', () => res.json(JSON.parse(data)))
//         }) 
//         request.on('error', error => console.log(error))
//         request.end()
//     } else {
//         res.sendStatus(400)
//     }
// })

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
        // const idHex = hash.substring(0, 3);
        // const transactionId = parseInt(idHex, 16);

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



        // TO DO NOTE
        // let image;
        // let smallestDiff = Infinity;
        // for (let i = 0; i < images.length; i++) {
        //     if (!images[i].blockIndex) {
        //         const diff = Math.abs(images[i].id - transactionId);
        //         if (diff < smallestDiff) {
        //             smallestDiff = diff;
        //             image = images[i];
        //         }
        //     }
        // }
        // image.blockIndex = blockchain.length;

        // properly format transaction as block
        const block = {
            hash: hash,
            time: currentTime,
            from: transaction.from,
            to: transaction.to,
            amount: transaction.amount,
            image: image,
        };
        blockchain.push(block)

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