const jwt = require("jsonwebtoken");

const secretKey = "TOKEN";

function decodeToken(token, requiredPermission) {
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
