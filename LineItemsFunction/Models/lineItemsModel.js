const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand
} = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
  // endpoint: "http://localhost:8000",
});

// CREATE DYNAMODB  DOCUMENT CLIENT

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const tableName = "Tender";

const LineItems = {
  create: async (projectPK, lineItemId, userPK, lineItemDetails) => {
    console.log(projectPK, lineItemId, userPK, lineItemDetails);
    const params = {
      TableName: tableName,
      Item: {
        ...lineItemDetails,
        PK: lineItemId,
        SK: projectPK,
        userPK: userPK,
      },
    };

    try {
      await docClient.send(new PutCommand(params));
      return { success: true, message: "LineItem Added Successfully" };
    } catch (err) {
      console.log("Unable to add LineItem", err);
      return { success: false, message: err.message };
    }
  },

  getLineItemsByProject: async (projectId, userPK) => {
    console.log("hi", projectId);
    console.log(`${projectId}#L`);
    const params = {
      TableName: tableName,
      IndexName: "GSI_SK", // Name of the GSI where SK is the partition key
      KeyConditionExpression: "SK = :sk and userPK = :userpk",
      FilterExpression: "begins_with(PK, :pkPrefix)", // Additional condition to match PK prefix
      ExpressionAttributeValues: {
        ":sk": projectId, // The value for SK (e.g., projectId)
        ":userpk": userPK, // The value for userPK
        ":pkPrefix": `${projectId}#L`, // The prefix for PK
      },
    };

    try {
      const data = await docClient.send(new QueryCommand(params));
      return { success: true, data: data.Items || null };
    } catch (err) {
      console.error("Unable to get details by SK and userPK", err);
      return { success: false, message: err.message };
    }
  },

  updateListItem: async (projectPK, lineItemId, updatedFields) => {
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    // Dynamically create the update expressions based on the provided updatedFields
    for (const [key, value] of Object.entries(updatedFields)) {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }

    const params = {
      TableName: tableName,
      Key: {
        PK: lineItemId,
        SK: projectPK,
      },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "UPDATED_NEW", // Return the updated attributes
    };

    try {
      const data = await docClient.send(new UpdateCommand(params));
      return {
        success: true,
        message: "LineItem updated successfully",
        data: data.Attributes,
      };
    } catch (err) {
      console.log("Unable to update LineItem", err);
      return { success: false, message: err.message };
    }
  },
};

module.exports = LineItems;
