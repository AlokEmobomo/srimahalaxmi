const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  GetCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

// CREATE DYNAMODB  DOCUMENT CLIENT

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "Tools";

async function create(ToolsId, OnHandPK, OnHandDetails,tableName) {
  console.log(ToolsId, OnHandPK, OnHandDetails, OnHandDetails.Quantity);

  // Check if the item with PK starting with 'ONHAND#' and given SK exists
  const scanParams = {
    TableName: tableName,
    FilterExpression: "begins_with(PK, :pkPrefix) AND SK = :sk",
    ExpressionAttributeValues: {
      ":pkPrefix": "ONHAND#",
      ":sk": ToolsId,
    },
  };

  try {
    const data = await docClient.send(new ScanCommand(scanParams));

    if (data.Items.length > 0) {
      // If the item exists, proceed with the update
      const updateParams = {
        TableName: tableName,
        Key: {
          PK: data.Items[0].PK, // Get the existing PK from the first matched item
          SK: ToolsId,
        },
        UpdateExpression:
          "SET #quantity = :quantity, #creationDate = :creationDate, #userPK = :userPK",
        ExpressionAttributeNames: {
          "#quantity": "Quantity",
          "#creationDate": "CreationDate",
          "#userPK":"userPK"
        },
        ExpressionAttributeValues: {
          ":quantity": OnHandDetails.Quantity,
          ":creationDate": OnHandDetails.CreationDate,
          ":userPK":OnHandDetails.userPK
        },
        ReturnValues: "UPDATED_NEW",
      };

      const result = await docClient.send(new UpdateCommand(updateParams));
      return {
        success: true,
        message: "OnHand Updated Successfully",
        data: result.Attributes,
      };
    } else {
      // If no items match, create a new OnHand entry
      const newOnHandParams = {
        TableName: tableName,
        Item: {
          ...OnHandDetails,
          PK: OnHandPK, // Construct a new PK
          SK: ToolsId,

        },
      };

      await docClient.send(new PutCommand(newOnHandParams));
      return {
        success: true,
        message: "New OnHand entry created successfully",
      };
    }
  } catch (err) {
    console.log("Error checking or updating OnHand", err);
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

async function updateToolsQuantity(ToolsId, quantity, tableName) {
  console.log(ToolsId, quantity);

  // Ensure the quantity passed is a valid number
  const Quantity = Number(quantity);
  if (isNaN(Quantity)) {
    return { success: false, message: "Quantity must be a valid number" };
  }

  console.log(Quantity);

  // Retrieve the existing item to check the current value of Quantity
  const getParams = {
    TableName: tableName,
    Key: {
      PK: ToolsId,
      SK: ToolsId,
    },
  };

  try {
    const result = await docClient.send(new GetCommand(getParams));

    // Ensure that Quantity exists and is a number
    const currentQuantity = result.Item ? result.Item.Quantity : 0;

    // Convert the current value to a string if necessary
    const updatedQuantity = Number(currentQuantity) + Quantity;

    // Now, we update the Quantity as a string
    const updateParams = {
      TableName: tableName,
      Key: {
        PK: ToolsId,
        SK: ToolsId,
      },
      UpdateExpression: "SET Quantity = :quantity",
      ExpressionAttributeValues: {
        ":quantity": String(updatedQuantity),  // Convert to string
      },
      ReturnValues: "UPDATED_NEW",
    };

    const updateResult = await docClient.send(new UpdateCommand(updateParams));
    return {
      success: true,
      message: "OnHand updated successfully",
      data: updateResult.Attributes,
    };
  } catch (err) {
    console.log("Unable to update OnHand", err);
    return { success: false, message: err.message };
  }
}



module.exports = { create, updateToolsQuantity, TransactionCreate };
