const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

// CREATE DYNAMODB  DOCUMENT CLIENT

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

async function GetDetailsBasedOnUserPKandEntityType(
  resolvedTableName,
  Module,
  userPK
) {
  const params = {
    TableName: resolvedTableName,
    IndexName: "EntityTypeIndex", // Replace with your GSI name
    KeyConditionExpression: "EntityType = :entityType AND userPK = :userPK",
    ExpressionAttributeValues: {
      ":entityType": Module,
      ":userPK": userPK,
    },
  };

  try {
    const result = await docClient.send(new QueryCommand(params));
    return { success: true, data: result.Items };
  } catch (err) {
    console.log("Unable to add Field", err);
    return { success: false, message: err.message };
  }
}

module.exports = { GetDetailsBasedOnUserPKandEntityType };
