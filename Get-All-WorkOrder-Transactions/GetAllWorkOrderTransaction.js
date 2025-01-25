const { getAllWorkOrderTransactions } = require("./GetAllWorkOrderTransactionModel");
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

  try {
    // Decode the token to get the userPK
    const decoded = decodeToken(token); // Provide your JWT secret key
    const userPK = decoded.UserId;
    const companyName = decoded.companyName;
    console.log(decoded.companyName);

    const sanitizedCompanyName = companyName
    .replace(/[\s&]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");

    const tableName = `${sanitizedCompanyName}-In-Out-Source`;

    console.log("Received event:", JSON.stringify(event, null, 2));
    console.log("userPK from token:", userPK);

    const result = await getAllWorkOrderTransactions(userPK,tableName);

    if (result.success) {
      return {
        statusCode: 200,
        body: JSON.stringify(result.data),
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: result.message }),
      };
    }
  } catch (error) {
    console.error("Error processing request:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
