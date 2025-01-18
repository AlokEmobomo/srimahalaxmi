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
  // endpoint: "http://localhost:8000",
});

// CREATE DYNAMODB  DOCUMENT CLIENT

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "InventoryOnHand";

async function create(productId, OnHandPK, OnHandDetails, tableName) {
  console.log(productId, OnHandPK, OnHandDetails, OnHandDetails.Quantity);

  // Check if the item with PK starting with 'ONHAND#' and given SK exists
  const scanParams = {
    TableName: tableName,
    FilterExpression: "begins_with(PK, :pkPrefix) AND SK = :sk",
    ExpressionAttributeValues: {
      ":pkPrefix": "ONHAND#",
      ":sk": productId,
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
          SK: productId,
        },
        UpdateExpression:
          "SET #quantity = :quantity, #creationDate = :creationDate",
        ExpressionAttributeNames: {
          "#quantity": "Quantity",
          "#creationDate": "CreationDate",
        },
        ExpressionAttributeValues: {
          ":quantity": OnHandDetails.Quantity,
          ":creationDate": OnHandDetails.CreationDate,
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
          SK: productId,
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
  sanitizedCompanyName
) {
  const params = {
    TableName:`${sanitizedCompanyName}-InventoryTransaction`,
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

async function updateProductQuantity(productId, quantity, sanitizedCompanyName) {
  console.log(productId, quantity);
  const Quantity = Number(quantity);
  if (isNaN(Quantity)) {
    return { success: false, message: "Quantity must be a number" };
  }
  console.log(Quantity);

  // First, get the current Quantity from DynamoDB
  const getParams = {
    TableName: `${sanitizedCompanyName}-Product`,
    Key: {
      PK: productId,
      SK: productId,
    },
    ProjectionExpression: "Quantity",
  };

  try {
    // Fetch the current value
    const currentData = await docClient.send(new GetCommand(getParams));
    let currentQuantity = 0;

    // Check if Quantity exists and is a number, else convert it
    if (currentData.Item && currentData.Item.Quantity) {
      currentQuantity = Number(currentData.Item.Quantity);
      if (isNaN(currentQuantity)) {
        // If it's not a number, reset to 0
        currentQuantity = 0;
      }
    }

    // Update the Quantity
    const updateParams = {
      TableName: `${sanitizedCompanyName}-Product`,
      Key: {
        PK: productId,
        SK: productId,
      },
      UpdateExpression: "SET Quantity = :newQuantity",
      ExpressionAttributeValues: {
        ":newQuantity": currentQuantity + Quantity,
      },
      ReturnValues: "UPDATED_NEW",
    };

    const result = await docClient.send(new UpdateCommand(updateParams));
    return {
      success: true,
      message: "OnHand updated successfully",
      data: result.Attributes,
      currentQuantity,
    };
  } catch (err) {
    console.log("Unable to update OnHand", err);
    return { success: false, message: err.message };
  }
}



module.exports = { create, updateProductQuantity, TransactionCreate };
