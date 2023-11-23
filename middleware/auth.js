const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const { token } = req.body;
  if (!token) {
    return res.status(403).send({ auth: false, message: "No Token Provided" });
  }
  jwt.verify(token, "anonID", function (err, decoded) {
    if (err) {
      console.log("Maybe Token is expired: ", { err });
      return res
        .status(500)
        .send({ auth: false, message: "Failed to authenticate token." });
    }
    req.data = decoded;
    next();
  });
}

module.exports = verifyToken;
