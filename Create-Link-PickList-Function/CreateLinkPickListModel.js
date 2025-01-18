const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand
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
  console.log(resolvedTableName)
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
    console.log(result)
    return { success: true, data: result.Items };
  } catch (err) {
    console.log("Unable to add Field", err);
    return { success: false, message: err.message };
  }
}

async function createPickList(Name, options, Attribute, Status, userPK) {
  const params = {
    TableName: "Picklist",
    Item: {
      PK: `PL#${Date.now()}`,
      SK: `PL#${Date.now()}`,
      CreationDate: new Date().toISOString().split("T")[0],
      EntityType: "PickList",
      Attribute: Attribute,
      Name: Name,
      Options: options,
      Status: Status || "Active", // Default to Active if not provided
      userPK: userPK, // Replace with dynamic userPK if needed
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

const getAllData = async () => {
  const params = {
    TableName: "Picklist", // Change this to your actual picklist table name
  };

  try {
    const result = await docClient.send(new ScanCommand(params));
    return result.Items; // Return all picklist items
  } catch (error) {
    console.error("Error fetching picklist data:", error);
    throw new Error("Error fetching picklist data");
  }
};

const updatePicklist = async (picklist) => {
  const params = {
    TableName: "Picklist", // Change this to your actual picklist table name
    Key: {
      PK: picklist.PK, // Partition key
      SK: picklist.SK, // Sort key
    },
    UpdateExpression: "set #options = :options", // Set the new options
    ExpressionAttributeNames: {
      "#options": "Options", // The attribute to update
    },
    ExpressionAttributeValues: {
      ":options": picklist.Options, // The new options array
    },
    ReturnValues: "UPDATED_NEW", // Return only the updated attributes
  };

  try {
    const result = await docClient.send(new UpdateCommand(params));
    console.log("Picklist updated:", result);
    return result;
  } catch (error) {
    console.error("Error updating picklist:", error);
    throw new Error("Error updating picklist");
  }
};

module.exports = {
  GetDetailsBasedOnUserPKandEntityType,
  createPickList,
  getAllData,
  updatePicklist,
};
