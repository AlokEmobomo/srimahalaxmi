const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
  // endpoint: "http://localhost:8000", // Uncomment if using local DynamoDB
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "Purchase-Reciept-Order";

async function getPurchaseById(purchaseId, tableName) {
  console.log("Querying for purchase ID:", purchaseId);
  const params = {
    TableName: tableName, // Corrected to TableName
    KeyConditionExpression: "PK = :pk",
    ExpressionAttributeValues: {
      ":pk": purchaseId,
    },
  };

  try {
    const data = await docClient.send(new QueryCommand(params));
    console.log("Query succeeded:", data); // Added debug log
    return { success: true, data: data };
  } catch (err) {
    console.error("Unable to query purchase", err);
    return { success: false, message: err.message };
  }
}

module.exports = { getPurchaseById };
