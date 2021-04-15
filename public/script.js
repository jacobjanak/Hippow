// track current transaction user is viewing
let currentBlockIndex;
let currentBlock;

let wallet = {
    address: localStorage.getItem("address"),
    privateKey: localStorage.getItem("privateKey"),
    publicKey: localStorage.getItem("publicKey"),
    balance: 0,
};

// function makeSecret() {
//     let result = "";
//     let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
//     let charactersLength = characters.length;
//     for (let i = 0; i < 24; i++ ) {
//         result += characters.charAt(Math.floor(Math.random() * charactersLength));
//     }
//     return result;
// }

function formatPublicKey(key) {
    let formatted = key.substring(26);
    formatted = formatted.slice(0, -24);
    return formatted.replace(/\r?\n|\r/g, "");
}

function formatPrivateKey(key) {
    let formatted = key.substring(31);
    formatted = formatted.slice(0, -29);
    return formatted.replace(/\r?\n|\r/g, "");
}

function unformatPublicKey(key) {
    return "-----BEGIN PUBLIC KEY-----\n" + key.replace(/(.{64})/g,"$1\n") + "\n-----END PUBLIC KEY-----";
}

function unformatPrivateKey(key) {
    return "-----BEGIN RSA PRIVATE KEY-----\n" + key.replace(/(.{64})/g,"$1\n") + "\n-----END RSA PRIVATE KEY-----";
}

if (!wallet.address) {
    const key = generateKeys();
    wallet.privateKey = formatPrivateKey(key.private);
    wallet.publicKey = formatPublicKey(key.public)
    wallet.address = sha256(wallet.publicKey);
    localStorage.setItem("privateKey", wallet.privateKey)
    localStorage.setItem("publicKey", wallet.publicKey)
    localStorage.setItem("address", wallet.address)
}

$("#wallet-address").text(wallet.address)
$("#wallet-secret").val(wallet.privateKey)
// $("#wallet-secret").text(wallet.privateKey.replace(/[^\dA-Z]/g, '').replace(/(.{4})/g, '$1 ').trim())

// load list of trusted servers from local storage
let serverList = JSON.parse(localStorage.getItem("serverList"))
if (!serverList) {
    serverList = ["https://spots-cc.herokuapp.com"];
}
$("#server-list").val(serverList.join("\n"))

function displayBlock(block, index) {
    console.log(block)
    return `
        <div class="transaction" data-index=${index}>
            <div class="status ${block.image.secret ? "confirmed" : "pending"}">
                ${block.image.secret
                    ? '<span class="adjust-left">Confirmed</span> <i class="fas fa-check-circle"></i>'
                    : '<span class="adjust-left">Pending</span> <i class="fas fa-exclamation-circle"></i>'}
            </div>
            <div class="hash">${block.hash.substring(0, 16)}...</div>
            ${index > 0 ? `<div class="from">From: &nbsp;${block.from.substring(0, 9)}...</div>` : ''}
            
            <div class="to">To: &nbsp;&nbsp;&nbsp;${block.to.substring(0, 9)}...</div>
            <div class="amount">Spots: ${block.amount}</div>
        </div>
    `;
}

// retrieve blockchain info
let blockchain = []; // the longest blockchain
for (let i = 0; i < serverList.length; i++) {
    $.get(serverList[i] + "/blockchain")
    .done(possibleBlockchain => {
        // if (validateBlockchain(possibleBlockchain)) {
            if (possibleBlockchain.length > blockchain.length) {
                blockchain = possibleBlockchain;
                processBlockchain(blockchain)
            }
        // }
    })
    .catch(err => console.log(err))
}

/*
function validateBlockchain(blockchain) {

    // validate genesis block
    const genesisBlock = blockchain[0];
    if (
        genesisBlock.hash != sha256("genesis") ||
        genesisBlock.time != 0 ||
        genesisBlock.from != "" ||
        genesisBlock.to != "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCWSW0fLPOICZJ5E0XCDWDlF+3luR05S7KEO865VCTZu9zG8Fim/uUq01RR9U9OqM3GTUapOGR8ADMSoah86IBYqjL/ZD8ComUK7yI2yyzYcD1suvEHWirym06ET/fgQI/Aqfbta84p/SO+HYXArjPqnegA+Y6XhOaHWLqDZhoexQIDAQAB" ||
        genesisBlock.amount != 1000000000 ||
        genesisBlock.image.secret != "genesis"
    ) {
        return false;
    }

    // validate every block
    for (let i = 1; i < blockchain.length; i++) {
        const previousBlock = blockchain[i - 1];
        const currentBlock = blockchain[i];

        if (
            currentBlock.time < previousBlock.time ||
            currentBlock.from.length != 216 ||
            currentBlock.to.length != 216
        ) {
            return false;
        }

        // TO DO: validate signature
        // TO DO: validate balances
        
        // create test hash
        let stringToHash = currentBlock.time;
        stringToHash += currentBlock.from;
        stringToHash += currentBlock.to;
        stringToHash += currentBlock.amount;
        stringToHash += currentBlock.signature;
        stringToHash += previousBlock.hash;
        const testHash = sha256(stringToHash);

        if (testHash != currentBlock.hash) {
            return false;
        }
    }

    return true;
}
*/

function processBlockchain(blockchain) {
    console.log(blockchain)
    $("#transactions-container").html(`<div id="transactions-header">Blockchain</div>`)
    for (let i = blockchain.length - 1; i >= 0; i--) {
        const block = blockchain[i];
        if (block.to === wallet.address && block.image.secret) {
            wallet.balance += parseInt(block.amount);
        }
        if (block.from === wallet.address) {
            wallet.balance -= parseInt(block.amount) + 1;
        }
        if (block.image) {
            if (block.image.spotter === wallet.address) {
                wallet.balance += 1;
            }
        }
        $("#transactions-container").append(displayBlock(block, i))
    }

    // $("#wallet-address").text(wallet.address.substring(0, 12) + "..")
    $("#wallet-balance").text(wallet.balance)
    $("#amount").attr("max", wallet.balance)
    $("#transactions-container").show()
    attachTransactionClickHandler()
}

$(".nav-link").on("click", function(e) {
    $(".transaction").removeClass("active")
    $("#genesis-container").hide()
    $("#transaction-container").hide()
    $("#image-container").hide()
    $("#secret-form").hide()

    // hide all pages
    $("#home-container").hide()
    $("#send-container").hide()
    $("#settings-container").hide()

    const page = $(this).attr("data-page");
    if (page === "home") {
        $("#home-container").show()
    }
    else if (page === "send") {
        $("#send-container").css({ display: "flex" })
    }
    else if (page === "settings") {
        $("#settings-container").show()
    }
})

$("#send-form").on("submit", e => {
    e.preventDefault()
    $("#send-error").hide()
    const to = $("#to").val().trim();
    const amount = parseInt($("#amount").val());

    // create transaction object
    const transaction = {
        from: wallet.publicKey,
        to: to,
        amount: amount - 1, // must pay 1 for fee
    }

    // generate signature
    // TO DO: add transaction data
    const signature = generateSignature(
        unformatPublicKey(wallet.publicKey),
        unformatPrivateKey(wallet.privateKey),
        transaction
    )

    // send data to server
    for (let i = 0; i < serverList.length; i++) {
        $.post(serverList[i] + "/transaction", {
            signature: signature,
            from: wallet.publicKey,
            to: to,
            amount: amount - 1, // must pay 1 for fee
        })
        .done(data => { window.location.reload() })
        .fail(function(err) {
            if (err.status != 200) {
                if (err.status === 500) {
                    $("#send-error").text("There are no images left to assign to your transaction. This is not your fault. Please wait a while and then try again.")
                }
                else if (err.status === 400) {
                    $("#send-error").text("The server could not approve your transaction.")
                } else {
                    $("#send-error").text("There was an error processing your transaction.")
                }
                $("#send-error").show()
                $("#amount").val("")
            }
        })
    }
})

$("#secret-form").on("submit", e => {
    e.preventDefault()
    $("#result").text("")
    const guess = $("#secret").val().trim().toLowerCase();
    $("#secret").val("")

    const testHash = sha256(currentBlock.image.url + guess);
    if (testHash === currentBlock.image.hash) {
        $("#result").css({ color: "#00C9B9" })
        $("#result").text("Correct!")

        // disable secret input
        $("#secret").prop("disabled", true);

        // update wallet balance
        wallet.balance += 1;
        if (currentBlock.to === wallet.address) {
            wallet.balance += currentBlock.amount;
        }
        $("#wallet-balance").text(wallet.balance)
        $("#amount").attr("max", wallet.balance)


        // update display of block in blockchain
        block = blockchain[currentBlockIndex];
        block.image.secret = guess;
        block.image.spotter = wallet.address;
        $(".transaction").each(function() {
            if ($(this).attr("data-index") == currentBlockIndex) {
                $(this).replaceWith(displayBlock(block, currentBlockIndex))
            }
        })

        // add click handler to new transaction
        $('.transaction').unbind('click')
        attachTransactionClickHandler()

        const signature = generateSignature(
            unformatPublicKey(wallet.publicKey),
            unformatPrivateKey(wallet.privateKey)
        )

        // send guess to server
        for (let i = 0; i < serverList.length; i++) {
            $.post(serverList[i] + "/spot", {
                secret: guess,
                blockIndex: currentBlockIndex,
                wallet: wallet.publicKey,
                signature: signature,
            })
            .done()
        }
    } else {
        $("#result").text("Incorrect guess")
        $("#result").css({ color: "red" })
    }
})

$("#server-form").on("submit", e => {
    e.preventDefault()
    const input = $("#server-list").val().trim();
    serverList = input.split("\n");
    for (let i = 0; i < serverList.length; i++) {
        serverList[i] = serverList[i].trim();
    }
    localStorage.setItem("serverList", JSON.stringify(serverList))
    window.location.reload()
})

$("#import-form").on("submit", e => {
    e.preventDefault()
    $("#import-error").hide()
    const input = $("#private-key").val().trim();
    try {
        const key = importKey(unformatPrivateKey(input));
        wallet.privateKey = formatPrivateKey(key.private);
        wallet.publicKey = formatPublicKey(key.public)
        wallet.address = sha256(wallet.publicKey);
        localStorage.setItem("privateKey", wallet.privateKey)
        localStorage.setItem("publicKey", wallet.publicKey)
        localStorage.setItem("address", wallet.address)
        window.location.reload()
    } catch (err) {
        $("#import-error").show()
        console.log(err)
    }
})

function attachTransactionClickHandler() {
    $(".transaction").on("click", function (e) {
        $(".transaction").removeClass("active")
        $(this).addClass("active")

        currentBlockIndex = parseInt($(this).attr("data-index"));
        // const block = blockchain[currentBlockIndex];
        currentBlock = blockchain[currentBlockIndex];

        // $("#transaction-hash").text(block.hash)
        // $("#transaction-from").text(block.from)
        // $("#transaction-to").text(block.to)
        // $("#transaction-amount").text(block.amount)

        // create deep copy
        const original = { ...currentBlock };
        original.image = { ...currentBlock.image };

        // format the block to remove useless info and prettify
        delete currentBlock.time;
        delete currentBlock.signature;
        delete currentBlock.publicKey;
        delete currentBlock.image.blockIndex;
        delete currentBlock.image.pin;
        delete currentBlock.image.alignment;
        delete currentBlock.image.publicKey;
        if (!currentBlock.image.secret) {
            currentBlock.image.secret = "???";
        }

        // display the block
        const transactionInfo = JSON.stringify(currentBlock, null, 4).replace(/"|,/g, '');
        const formatted = `<pre><code>Transaction Details\n${transactionInfo}</code></pre>`;
        $("#transaction-info-container").html(formatted)

        // restore the block
        blockchain[currentBlockIndex] = original;
        currentBlock = original;

        $("#transaction-container").show()
        $("#secret").prop("disabled", false);
        $("#home-container").hide()
        $("#send-container").hide()
        $("#settings-container").hide()

        if (currentBlockIndex === 0) {
            $("#genesis-container").show()
            $("#secret-form").hide()
            $("#confirmed-container").hide()
        } else {
            $("#genesis-container").hide()
            if (currentBlock.image.secret) {
                $("#secret-form").hide()
                $("#secret-reveal").text(currentBlock.image.secret)
                $("#confirmed-container").show()
            }
            else {
                $("#result").text("")
                $("#secret-form").show()
                $("#confirmed-container").hide()
            }
        }

        if (currentBlockIndex > 0) {
            const $img = $("<img>");
            $img.attr("src", currentBlock.image.url)        
            $("#image-container").show()
            $("#image-container").html($img)
        } else {
            $("#image-container").hide()
        }  
    })
}

$("#balance-container").on("mouseenter", function(e) {
    // $(this).append(`<p>Address</p><p>${wallet.address}</p>`)
    $("#wallet-info").show()
    $("#cover-up").show()
})

$("#balance-container").on("mouseleave", function(e) {
    // $(this).append(`<p>Address</p><p>${wallet.address}</p>`)
    $("#wallet-info").hide()
    $("#cover-up").show()
})

$("#show").on("click", function(e) {
    $("#cover-up").hide()
})