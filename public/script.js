// track current transaction user is viewing
let currentBlockIndex;
let currentBlock;
// let currentDataURI;

let wallet = {
    address: localStorage.getItem("walletAddress"),
    balance: 0,
};

function makeSecret() {
    let result = "";
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let charactersLength = characters.length;
    for (let i = 0; i < 24; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

if (!wallet.address) {
    wallet.secret = makeSecret();
    wallet.address = sha256(wallet.secret);
    localStorage.setItem("walletSecret", wallet.secret)
    localStorage.setItem("walletAddress", wallet.address)
} else {
    wallet.secret = localStorage.getItem("walletSecret");
}

$("#wallet-address").text(wallet.address)
$("#wallet-secret").text(wallet.secret.replace(/[^\dA-Z]/g, '').replace(/(.{4})/g, '$1 ').trim())

// load list of trusted servers from local storage
let serverList = JSON.parse(localStorage.getItem("serverList"))
if (!serverList) {
    serverList = ["http://localhost:8000"];
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
let bestServer = ""; // server with the longest blockchain
let blockchain = []; // the longest blockchain
for (let i = 0; i < serverList.length; i++) {
    $.get(serverList[i] + "/api/blockchain")
    .done(possibleBlockchain => {
        if (validateBlockchain(possibleBlockchain)) {
            if (possibleBlockchain.length > blockchain.length) {
                bestServer = serverList[i];
                blockchain = possibleBlockchain;
                processBlockchain(blockchain)
            }
        }
    })
    .catch(err => console.log(err))
}

function validateBlockchain(blockchain) {

    // validate genesis block
    const genesisBlock = blockchain[0];
    if (
        genesisBlock.hash != sha256("genesis") ||
        genesisBlock.time != 0 ||
        genesisBlock.from != "" ||
        genesisBlock.to != "d8f90747cafcd65366c66ab9a6264889e90e21cf72786ed040b7f4c32ecb942c" ||
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
            currentBlock.from.length != 64 ||
            currentBlock.to.length != 64
        ) {
            return false;
        }
        
        // create test hash
        let stringToHash = currentBlock.time;
        stringToHash += currentBlock.from;
        stringToHash += currentBlock.to;
        stringToHash += currentBlock.amount;
        stringToHash += previousBlock.hash;
        const testHash = sha256(stringToHash);

        if (testHash != currentBlock.hash) {
            return false;
        }
    }

    return true;
}

function processBlockchain(blockchain) {
    console.log(blockchain)
    $("#transactions-container").html(`<div id="transactions-header">Blockchain</div>`)
    for (let i = blockchain.length - 1; i >= 0; i--) {
        const block = blockchain[i];
        if (block.to === wallet.address) {
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
    console.log(page)
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
    const to = $("#to").val().trim();
    const amount = parseInt($("#amount").val());

    if (amount > 0) {

        // send data to server
        // to do: add signature
        for (let i = 0; i < serverList.length; i++) {
            $.post(serverList[i] + "/api/transaction", {
                from: wallet.address,
                to: to,
                amount: amount,
            })
            .done(data => { window.location.reload() })
        }
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

        // send guess to server
        for (let i = 0; i < serverList.length; i++) {
            $.post(serverList[i] + "/spot", {
                secret: guess,
                blockIndex: currentBlockIndex,
                wallet: wallet.address,
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

        let altered = false;
        if (!currentBlock.image.secret) {
            currentBlock.image.secret = "???";
            altered = true;
        }
        delete currentBlock.image.blockIndex; // just doing this because its useless
        const transactionInfo = JSON.stringify(currentBlock, null, 4).replace(/"|,/g, '');
        if (altered) delete currentBlock.image.secret;
        const formatted = `<pre><code>Transaction Details\n${transactionInfo}</code></pre>`;
        $("#transaction-info-container").html(formatted)

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