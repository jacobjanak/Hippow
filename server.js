require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const Block = require('./block.js');
// const images = require('./images.json');


// temp ///////////////////////////////
// const sha256 = require('js-sha256');

// const hash1 = sha256.create();
// hash1.update(images[0].dataURI + "tmux")
// images[0].hash = hash1.hex();

// const hash2 = sha256.create();
// hash2.update(images[1].dataURI + "chart")
// images[1].hash = hash2.hex();

// const hash1guess = sha256.create();
// const guess = "tmux";
// hash1guess.update(images[0].dataURI + guess)
// if (images[0].hash === hash1guess.hex()) {
//     console.log("correct guess!")
// } else {
//     console.log("WRONG")
// }
// end temp ///////////////////////////////

// server
const app = express();
const PORT = 8000;

// middleware
app.use(express.static("public"))
app.use(express.json())
app.use(bodyParser.json({ limit: "50mb" }))
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }))

// routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "./index.html"))
})

app.get("/send", (req, res) => {
    res.sendFile(path.join(__dirname, "./transaction.html"))
})


// image stuff ///////////////////////////
const images = [];

app.get("/api/images", (req, res) => {
    res.json(images)
})

const sha256 = require('js-sha256');

app.post("/api/image-identification", (req, res) => {
    const input = req.body;

    // remove whitespace
    input.identification = input.identification.trim();
    input.dataURI = input.dataURI.trim();

    // validate input
    if (input.identification) {
        if (typeof input.identification === "string") {
            if (input.dataURI) {
                if (typeof input.dataURI === "string") {

                    // create hash for image using secret word
                    // to do: this should be on the front-end instead
                    const hash = sha256(input.identification + input.dataURI)

                    // to create id convert first 3 hex digits of hash to decimal
                    const idHex = hash.substring(0, 3);
                    const idDecimal = parseInt(idHex, 16);

                    // image object
                    // to do: this should probably be its own class
                    const image = {
                        id: idDecimal,
                        dataURI: input.dataURI,
                        hash: hash,
                    };

                    // if image array is empty just insert image
                    if (images.length === 0) {
                        images.push([image])

                    // find correct index in image array to insert image at
                    } else {
                        for (let i = 0; i < images.length; i++) {

                            // if images shares id with existing image we append at that index
                            if (images[i][0].id === idDecimal) {
                                images[i].push(image)
                                break
                            }

                            // append at this index to keep array sorted
                            else if (images[i][0].id > idDecimal) {
                                console.log('hi')
                                if (i === 0) images.unshift([image])
                                else images.splice(i, 0, [image])
                                break
                            }

                            // push image to end of array if it has highest id
                            else if (i === images.length - 1) {
                                images.push([image])
                            }
                        }
                    }

                    console.log("")
                    console.log("")
                    console.log("")
                    for (let i = 0; i < images.length; i++) {
                        console.log("-------------------")
                        console.log("id: " + images[i][0].id)
                        console.log("hash: " + images[i][0].hash)
                    }

                    // successfully end
                    return res.sendStatus(200);
                }
            }
        }
    }
    
    // if we failed a check just send 400 bad request code
    return res.sendStatus(400);
})
// end image stuff ///////////////////////////


// transaction stuff/////////////////
const blockchain = []
app.post("/api/transaction", (req, res) => {
    const transaction = req.body;

    if (images.length > 0) {
        blockchain.push(new Block(blockchain, images, transaction.from, transaction.to, transaction.amount))
        console.log(blockchain)
        return res.sendStatus(200);
    }

    return res.sendStatus(500);
})
// end transaction stuff/////////////////


// wallets stuff //////////////////////////
// const wallets = [];

// app.post("/api/wallets/new")


// end wallets stuff //////////////////////////

// blockchain stuff ////////////////////////////

app.get("/api/balances", (req, res) => {
    const balances = {};
    for (let i = 0; i < blockchain.length; i++) {
        const transaction = blockchain[i];

        // to do: validate transaction
        
        balances[transaction.from] -= amount;
        if (balances[transaction.to]) {
            balances[transaction.to] += amount;
        } else {
            balances[transaction.to] = amount;
        }
    }

    res.json(balances)
})

// blockchain.push(new Block(blockchain, images, "santa", "me", 5))
// blockchain.push(new Block(blockchain, images, "mom", "me", 3))
// blockchain.push(new Block(blockchain, images, "me", "sister", 2))
// end blockchain stuff ////////////////////////////

// start server
app.listen(PORT, () => console.log('Server running at localhost:' + PORT))