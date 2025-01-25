const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
//   endpoint: "http://localhost:8000",
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "Vendor";

async function getVendorById(vendorId, tableName) {
  const params = {
    TableName: tableName,
    KeyConditionExpression: "PK = :pk",
    ExpressionAttributeValues: {
      ":pk": vendorId,
    },
  };

  try {
    const data = await docClient.send(new QueryCommand(params));
    return { success: true, data: data.Items || [] };
  } catch (err) {
    console.error("Unable to query vendor", err);
    return { success: false, message: err.message };
  }
}

module.exports = { getVendorById };
