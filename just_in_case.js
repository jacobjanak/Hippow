const jwt = require('jsonwebtoken');
const NodeRSA = require('node-rsa');

window.foo = function(bar) {
  const key = new NodeRSA([bar, { b: 256 }]);
  console.log(key.exportKey('public'))
}

window.generateKeys = function() {
  const key = new NodeRSA({ b: 256 });
  return {
    public: key.exportKey('public'),
    private: key.exportKey('private'),
  }
}

window.generateSignature = function(publicKey, privateKey) {
  return jwt.sign({}, privateKey, {
    algorithm: "RS256"
  });
}

window.verify = function(signature, publicKey) {
  const verifyOptions = { algorithms: ["RS256"] };
  const verified = jwt.verify(signature, publicKey, verifyOptions);
  console.log("\n Verified: " + JSON.stringify(verified));
  const decoded = jwt.decode(signature, {complete: true});
  console.log(decoded)
}

function App() {
  return (
    <div className="App"></div>
  );
}

export default App;
