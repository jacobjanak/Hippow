// dependencies
const express = require("express");
const bodyParser = require("body-parser");
const https = require("https");
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const sha256 = require("js-sha256");

// values
const imageURL = "https://ispy-beta.herokuapp.com";
const burnAddress = "0000000000000000000000000000000000000000000000000000000000000000";

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

// database
if (process.env.project_id) {
    admin.initializeApp({ credential: admin.credential.cert({
        project_id: process.env.project_id,
        type: process.env.type,
        private_key_id: process.env.private_key_id,
        private_key: process.env.private_key.replace(/\\n/g, '\n'),
        client_email: process.env.client_email,
        client_id: process.env.client_id,
        auth_uri: process.env.auth_uri,
        token_uri: process.env.token_uri,
        auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
        client_x509_cert_url: process.env.client_x509_cert_url,
    })})
} else {
    const sdk = require("./firebase-adminsdk.json");
    console.log(sdk)
    admin.initializeApp({ credential: admin.credential.cert(sdk) })
}
const db = admin.firestore();

// load blockchain
let blockchain = [];
const balances = {};
db.collection('hippow').doc('blockchain').get()
.then(doc => {
    if (!doc.exists) console.error("No such document");
    blockchain = doc.data().blockchain;

    // update balances
    for (let i = 0; i < blockchain.length; i++) {
        const block = blockchain[i];
        balances[block.from] -= block.amount + 1;
        if (block.image.secret) {
            if (balances[block.to]) {
                balances[block.to] += block.amount;
            } else {
                balances[block.to] = block.amount;
            }
            if (balances[block.image.spotter]) {
                balances[block.image.spotter] += 1;
            } else {
                balances[block.image.spotter] = 1;
            }
        }
    }
})
.catch(err => { console.error(err) })

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
            if (i === 0) images.unshift(image);
            else images.splice(i, 0, image);
            break
        }
        else if (i === images.length - 1) {
            images.push(image)
            break
        }
    }
    if (images.length === 0) images.push(image);
}

// RSA signature util
function formatKey(key) {
    return "-----BEGIN PUBLIC KEY-----\n" + key.replace(/(.{64})/g,"$1\n") + "\n-----END PUBLIC KEY-----";
}

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

                // create hash
                const currentTime = new Date().getTime();
                const prevBlock = blockchain[blockchain.length - 1];
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

                // properly format transaction as block
                const block = {
                    hash: hash,
                    time: currentTime,
                    from: transaction.from,
                    to: transaction.to,
                    amount: transaction.amount,
                    publicKey: transaction.publicKey,
                    signature: transaction.signature,
                    image: image,
                };
                blockchain.push(block)

                // update database
                db.collection("hippow").doc("blockchain").set({ blockchain })

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

            // update balances
            if (balances[block.to]) {
                balances[block.to] += block.amount;
            } else {
                balances[block.to] = block.amount;
            }

            // update blockchain
            block.image.secret = spot.secret;
            block.image.spotter = spot.wallet;
            block.image.publicKey = spot.publicKey;

            // update database
            db.collection("hippow").doc("blockchain").set({ blockchain })

            return res.sendStatus(200)
        }
    }

    // error
    return res.sendStatus(400)
})

// start server
app.listen(PORT, () => console.log('Server running at localhost:' + PORT))
