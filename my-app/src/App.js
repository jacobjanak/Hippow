const jwt = require('jsonwebtoken');
const NodeRSA = require('node-rsa');


window.generateKeys = function() {
  const key = new NodeRSA({ b: 512 });
  return {
    public: key.exportKey('public'),
    private: key.exportKey('private'),
  }
}

window.generateSignature = function(publicKey, privateKey, data) {
  if (!data) data = {};
  return jwt.sign(data, privateKey, {
    algorithm: "RS256"
  });
}

window.verify = function(signature, publicKey) {
  const verifyOptions = { algorithms: ["RS256"] };
  const verified = jwt.verify(signature, publicKey, verifyOptions);
  const decoded = jwt.decode(signature, { complete: true });
}

window.importKey = function(privateKey) {
  const key = new NodeRSA();
  key.importKey(privateKey);
  return {
    public: key.exportKey('public'),
    private: key.exportKey('private'),
  }
}

function App() {
  return (
    <div className="App"></div>
  );
}

export default App;
