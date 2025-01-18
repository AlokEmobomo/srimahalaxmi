const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
  // endpoint: "http://localhost:8000",
});

// CREATE DYNAMODB  DOCUMENT CLIENT

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "InventoryOnHand";

async function create(productId, OnHandPK, OnHandDetails , sanitizedCompanyName) {
  console.log(productId, OnHandPK, OnHandDetails, OnHandDetails.Quantity);

  // Check if the item with PK starting with 'ONHAND#' and given SK exists
  const scanParams = {
    TableName: `${sanitizedCompanyName}-InventoryOnHand`,
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
          PK: data.Items[0].PK, 
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


module.exports = { create };
