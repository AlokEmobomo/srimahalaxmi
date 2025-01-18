const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

// CREATE DYNAMODB  DOCUMENT CLIENT

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const tableName = "DynamicForm";

async function createField(ModuleName, userPK, Values, DynamicFormId, creationDate) {
  console.log(ModuleName, userPK, Values);
  
  // Ensure Values is stored as an array
  const valuesArray = Array.isArray(Values) ? Values : [Values];

  const params = {
    TableName: tableName,
    Item: {
      PK: DynamicFormId,
      SK: DynamicFormId,
      userPK: userPK,
      ModuleName: ModuleName,
      Values: valuesArray,
      EntityType: "DynamicForm",
      creationDate: creationDate,
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    return { success: true, message: "Field Added Successfully" };
  } catch (err) {
    console.log("Unable to add Field", err);
    return { success: false, message: err.message };
  }
}


async function checkModuleExists(userPK, ModuleName) {
  const params = {
    TableName: tableName,
    IndexName: "userPK-ModuleName-index",
    KeyConditionExpression: "userPK = :userPK AND ModuleName = :ModuleName",
    ExpressionAttributeValues: {
      ":userPK": userPK,
      ":ModuleName": ModuleName,
    },
  };

  try {
    const result = await docClient.send(new QueryCommand(params));
    console.log(result)

    if (result.Items.length === 0) {
      return { success: false, message: "No matching module found" };
    }

    return { success: true, data: result.Items };
  } catch (err) {
    console.error("Unable to fetch Receipts", err.message);
    return { success: false, message: err.message };
  }
}


async function updateExistingField(ModuleName, userPK, updateDetails, DynamicFormId) {
  // Ensure updateDetails is an array
  if (!Array.isArray(updateDetails)) {
    return { success: false, message: "updateDetails must be an array" };
  }

  // Prepare the update parameters
  const params = {
    TableName: tableName,
    Key: {
      PK: DynamicFormId,
      SK: DynamicFormId,
    },
    UpdateExpression: "SET #Values = list_append(if_not_exists(#Values, :emptyList), :Values)",
    ExpressionAttributeNames: {
      "#Values": "Values",
    },
    ExpressionAttributeValues: {
      ":emptyList": [],
      ":Values": updateDetails,
    },
    ReturnValues: "ALL_NEW", // Returns the updated item
  };

  try {
    // Perform the update
    const data = await docClient.send(new UpdateCommand(params));
    console.log("Update successful:", JSON.stringify(data, null, 2));
    return { success: true, message: "Field updated successfully", data };
  } catch (err) {
    console.error("Unable to update the field:", err);
    return { success: false, message: err.message };
  }
}



module.exports = { createField, checkModuleExists, updateExistingField };
