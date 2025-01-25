const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

// CREATE DYNAMODB DOCUMENT CLIENT

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "In-Out-Source"; 

async function updateInHouse(WorkOrderPK, updatedFields, tableName) {
  console.log(WorkOrderPK, updatedFields);
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  // Dynamically create the update expressions based on the provided updatedFields
  for (const [key, value] of Object.entries(updatedFields)) {
    if (value !== undefined) { // Check that value is defined
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }
  }

  const params = {
    TableName: tableName,
    Key: {
      PK: WorkOrderPK,
      SK: WorkOrderPK,
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
      message: "WorkOrder updated successfully",
      data: data.Attributes,
    };
  } catch (err) {
    console.log("Unable to update Product", err);
    return { success: false, message: err.message };
  }
}

module.exports = { updateInHouse };
