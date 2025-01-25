const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
  // endpoint: "http://localhost:8000",
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "Product";

async function getProductsById(productId, tableName) {
  console.log("Querying product with ID:", productId);

  const params = {
    TableName: tableName,
    KeyConditionExpression: "PK = :pk", // Only filtering by the partition key
    ExpressionAttributeValues: {
      ":pk": productId, // Provide the userPK value
    },
  };

  try {
    const data = await docClient.send(new QueryCommand(params));

    console.log("Query Response:", data); // Log the entire response for debugging

    return { success: true, data: data.Items || [] }; // Return the items or an empty array
  } catch (err) {
    console.error("Unable to query products", err);
    return { success: false, message: err.message }; // Return the error message
  }
}

module.exports = { getProductsById };
