const { getAllProducts } = require("./GetAllProductsModel");
const decodeToken = require("./decodeToken");

exports.handler = async (event) => {
const authHeader = event.headers.Authorization || event.headers.authorization;

if (!authHeader) {
  return {
    statusCode: 401,
    body: JSON.stringify({ error: "Authorization header is missing" }),
  };
}

const token = authHeader.split(" ")[1];
if (!token) {
  return {
    statusCode: 401,
    body: JSON.stringify({ error: "Token is missing" }),
  };
}
// Decode the token to get the userPK
const decoded = decodeToken(token); // Provide your JWT secret key
const userPK = decoded.UserId;
const companyName = decoded.companyName;
  console.log(decoded.companyName);

  const sanitizedCompanyName = companyName
  .replace(/[\s&]/g, "")
  .replace(/[^a-zA-Z0-9]/g, "");

  const tableName = `${sanitizedCompanyName}-Product`;

console.log("Received event:", JSON.stringify(event, null, 2));
console.log("userPK from token:", userPK);

  try {
    const startTime = Date.now();
    const result = await getAllProducts(userPK,tableName);
    console.log(`Execution Time: ${Date.now() - startTime} ms`);

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Error fetching products:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
