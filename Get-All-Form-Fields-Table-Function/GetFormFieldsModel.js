const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const tableName = "DynamicForm";

async function getFieldsByModule(userPK, ModuleName) {
  console.log(userPK, ModuleName);
  const params = {
    TableName: tableName,
    IndexName: "userPK-ModuleName-index", // GSI with userPK as partition key and ModuleName as sort key
    KeyConditionExpression: "userPK = :userPK AND ModuleName = :ModuleName", // Corrected the spacing
    ExpressionAttributeValues: {
      ":userPK": userPK, // Removed extra space
      ":ModuleName": ModuleName, // Removed extra space
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
    console.error("Unable to fetch Products:", err);
    return {
      success: false,
      message: err.message, // Return error message
    };
  }
}

module.exports = { getFieldsByModule };
