const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

// CREATE DYNAMODB  DOCUMENT CLIENT

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "Tools";

async function create(ToolsId, userPK, ToolsDetails,tableName) {
  console.log(ToolsId, userPK, ToolsDetails);
  const params = {
    TableName: tableName,
    Item: {
      ...ToolsDetails,
      PK: ToolsId,
      SK: ToolsId,
      userPK: userPK,
      // RemoveFlag:1
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    return { success: true, message: "Tools Added Successfully" };
  } catch (err) {
    console.log("Unable to add Tools", err);
    return { success: false, message: err.message };
  }
}

async function TransactionCreate(
  InventoryTransactionId,
  OnHandPK,
  TransactionDetails,
  tableName
) {
  const params = {
    TableName: tableName,
    Item: {
      ...TransactionDetails,
      PK: InventoryTransactionId,
      SK: OnHandPK,
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    return {
      success: true,
      message: "Onhand Inventory Transaction Added Successfully",
    };
  } catch (err) {
    console.log("Unable to add Onhand Inventory Transaction", err);
    return { success: false, message: err.message };
  }
}

async function OnHandCreate(ToolsId, OnHandPK, OnHandDetails,tableName) {
  console.log(ToolsId, OnHandPK, OnHandDetails, OnHandDetails.Quantity);

  // Set up parameters for updating quantity and creation date
  const updateParams = {
    TableName: tableName,
    Key: {
      PK: OnHandPK,
      SK: ToolsId,
    },
    UpdateExpression:
      "SET #quantity = :quantity, #creationDate = :creationDate, #name = :name, #EntityType = :EntityType, #userPK = :userPK",
    ExpressionAttributeNames: {
      "#quantity": "Quantity",
      "#creationDate": "CreationDate",
      "#name":"Name",
      "#EntityType":"EntityType",
      "#userPK":"userPK"
    },
    ExpressionAttributeValues: {
      ":quantity": OnHandDetails.Quantity,
      ":creationDate": OnHandDetails.CreationDate,
      ":name":OnHandDetails.Name,
      ":EntityType":OnHandDetails.EntityType,
      ":userPK":OnHandDetails.userPK
    },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    // Try to update the quantity and creation date if the SK exists
    const result = await docClient.send(new UpdateCommand(updateParams));
    return {
      success: true,
      message: "OnHand Updated Successfully",
      data: result.Attributes,
    };
  } catch (err) {
    // If the item doesn't exist, create it
    if (err.name === "ConditionalCheckFailedException") {
      const putParams = {
        TableName: tableName,
        Item: {
          ...OnHandDetails,
          PK: OnHandPK,
          SK: ToolsId,
        },
      };

      try {
        await docClient.send(new PutCommand(putParams));
        return { success: true, message: "OnHand Added Successfully" };
      } catch (putErr) {
        console.log("Unable to add OnHand", putErr);
        return { success: false, message: putErr.message };
      }
    } else {
      console.log("Unable to update OnHand", err);
      return { success: false, message: err.message };
    }
  }
}


module.exports = { create, TransactionCreate, OnHandCreate };
