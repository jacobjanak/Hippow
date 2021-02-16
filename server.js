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
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// routes
// app.get("/", (req, res) => {
//     res.sendFile(path.join(__dirname, "./transaction.html"))
// })


// image stuff ///////////////////////////
// const images = [];

app.get("/api/images", (req, res) => {

    // send request to image server for image array
    const url = "https://ispy-beta.herokuapp.com/images";
    const request = https.request(url, (response) => { 
        let data = ''; 
        response.on('data', chunk => data += chunk.toString())
        response.on('end', () => res.json(JSON.parse(data))) 
    }) 
    request.on('error', (error) => console.log(error))
    request.end()  


    // res.json(images)
    
    // const options = {
    //     hostname: 'ispy-beta.herokuapp.com',
    //     port: 443,
    //     path: '/images',
    //     method: 'GET',
    // }

    // const foo = https.request(options, res2 => {
    //     console.log(`statusCode: ${res2.statusCode}`)

    //     res2.on('data', d => {
    //         // images.push(d)
    //         process.stdout.write(d)
    //     })
    // })

    // foo.on('error', error => {
    //     console.error(error)
    // })

    // foo.end()

    // res.json(images)

    // var request = require('request');
    // request('http://127.0.0.1:1234', function (err, res) {
    //     if (err) return console.error(err.message);

    //     console.log(res.body);
    //     // Hello world

    //     server.close();
    // });
})

// TO DO: IMAGE STUFF


// transaction stuff/////////////////


// create genesis block
const currentTime = new Date().getTime();
const hash = sha256("genesis");
const genesisBlock = {
    hash: hash,
    time: currentTime,
    to: hash,
    amount: 1000000,
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
        image.dataURI = "";

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
// end transaction stuff/////////////////


// wallets stuff //////////////////////////
// const wallets = [];

// app.post("/api/wallets/new")


// end wallets stuff //////////////////////////

// blockchain stuff ////////////////////////////

// app.get("/api/balances", (req, res) => {
//     const balances = {};
//     for (let i = 0; i < blockchain.length; i++) {
//         const transaction = blockchain[i];

//         // to do: validate transaction
        
//         balances[transaction.from] -= amount;
//         if (balances[transaction.to]) {
//             balances[transaction.to] += amount;
//         } else {
//             balances[transaction.to] = amount;
//         }
//     }

//     res.json(balances)
// })

// blockchain.push(new Block(blockchain, images, "santa", "me", 5))
// blockchain.push(new Block(blockchain, images, "mom", "me", 3))
// blockchain.push(new Block(blockchain, images, "me", "sister", 2))
// end blockchain stuff ////////////////////////////

// start server
app.listen(PORT, () => console.log('Server running at localhost:' + PORT))