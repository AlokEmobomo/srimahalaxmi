const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");
const decodeToken = require("./decodeToken");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);


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

  const tableName =  `${sanitizedCompanyName}-Increment`;

  const primaryKey = {
    PK: "RECEIPTINCREMENT#1",
    SK: "RECEIPTINCREMENT#1",
  };

  // Step 1: Fetch the current IncrementValue
  const getParams = {
    TableName: tableName,
    Key: primaryKey,
    ProjectionExpression: "IncrementValue",
  };

  let currentIncrement;
  try {
    const result = await docClient.send(new GetCommand(getParams));
    currentIncrement = result.Item ? result.Item.IncrementValue : "A1";

    // Return the increment value as a successful response
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        incrementValue: currentIncrement,
      }),
    };
  } catch (err) {
    console.error("Error fetching IncrementValue:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Could not fetch IncrementValue",
      }),
    };
  }
};
