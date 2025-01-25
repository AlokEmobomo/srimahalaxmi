const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const tableName = "Picklist";

async function getAllPickLists(userPK) {
  const params = {
    TableName: tableName,
    IndexName: "EntityTypeIndex", // GSI with EntityType as partition key and userPK as sort key
    KeyConditionExpression: "EntityType = :entityType AND userPK = :userPK", // Both partition and sort key
    ExpressionAttributeValues: {
      ":entityType": "PickList",
      ":userPK": userPK,
    },
  };

  try {
    const result = await docClient.send(new QueryCommand(params));

    // Check for LastEvaluatedKey to handle pagination
    const hasMore = !!result.LastEvaluatedKey;

    return {
      success: true,
      data: result.Items,
      hasMore, // Indicate if there are more items to fetch
      lastEvaluatedKey: result.LastEvaluatedKey, // Optionally return the last evaluated key for further queries
    };
  } catch (err) {
    console.error("Unable to fetch PickLists:", err);
    return {
      success: false,
      message: err.message, // Return error message
    };
  }
}

module.exports = { getAllPickLists };
