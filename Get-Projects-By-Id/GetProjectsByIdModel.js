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

// const tableName = "Tender";

async function getProjectsById(projectId, tableName) {
  console.log(projectId);
  const params = {
    TableName: tableName,
    KeyConditionExpression: "PK = :pk", // Only filtering by the partition key
    ExpressionAttributeValues: {
      ":pk": projectId, // Provide the userPK value
    },
  };

  try {
    const data = await docClient.send(new QueryCommand(params));
    return { success: true, data: data.Items || [] }; // Return all items or an empty array
  } catch (err) {
    console.error("Unable to query projects", err);
    return { success: false, message: err.message }; // Return the error message
  }
}


module.exports = { getProjectsById };
