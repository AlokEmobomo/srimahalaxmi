const jwt = require("jsonwebtoken");

function decodeToken(token) {
  const secretKey = "SEND_TOKEN";
  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, secretKey);
    return decoded;
  } catch (error) {
    // Token verification failed
    throw new Error("Invalid token");
  }
}

module.exports = decodeToken;
