const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "Vendor";

async function getCustomerById(customerId, tableName) {
  const params = {
    TableName: tableName,
    KeyConditionExpression: "PK = :pk",
    ExpressionAttributeValues: {
      ":pk": customerId,
    },
  };

  try {
    const data = await docClient.send(new QueryCommand(params));
    return { success: true, data: data.Items || [] };
  } catch (err) {
    console.error("Unable to query customer", err);
    return { success: false, message: err.message };
  }
}

module.exports = { getCustomerById };
