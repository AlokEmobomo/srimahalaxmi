const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "InventoryTransaction";

async function InventoryTransaction(
  InventoryTransactionId,
  ReceiptLineItemId,
  WorkOrderId,
  ProductName,
  ProductQuantity,
  ReceiptQuantity,
  Date,
  ReceiptId,
  OnhandQuantity,
  userPK,
  sanitizedCompanyName
) {
  const params = {
    TableName: `${sanitizedCompanyName}-InventoryTransaction`,
    Item: {
      PK: InventoryTransactionId,
      SK: ReceiptLineItemId,
      userPK: userPK,
      WorkOrderId:WorkOrderId,
      Name: ProductName,
      ProductQuantity: ProductQuantity,
      ReceiptQuantity: ReceiptQuantity,
      CreationDate: Date,
      GSI: ReceiptId,
      OnhandQuantity: OnhandQuantity,
      EntityType: "InventoryTransaction",
      Type: "Receipt",
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    return {
      success: true,
      message: "Receipt Inventory Transaction Added Successfully",
    };
  } catch (err) {
    console.log("Unable to add Receipt Inventory Transaction", err);
    return { success: false, message: err.message };
  }
}

async function getProductsByName(productName, sanitizedCompanyName) {
  console.log(productName, sanitizedCompanyName);
  const params = {
    TableName: `${sanitizedCompanyName}-Product`,
    FilterExpression: "#name = :projectName",
    ExpressionAttributeNames: {
      "#name": "Name", // Use a placeholder for the reserved keyword
    },
    ExpressionAttributeValues: {
      ":projectName": productName,
    },
  };

  try {
    const data = await docClient.send(new ScanCommand(params));
    return { success: true, projects: data.Items };
  } catch (err) {
    console.error("Unable to query projects:", err);
    return { success: false, message: err.message };
  }
}

async function updateProductQuantity(productPK, newQuantity, sanitizedCompanyName) {
  console.log(productPK, newQuantity, sanitizedCompanyName);
  console.log("sanitizedCompanyName:", sanitizedCompanyName)
  const params = {
    TableName: `${sanitizedCompanyName}-Product`, // Replace with your actual table name
    Key: {
      PK: productPK,
      SK: productPK, // Assuming PK is the partition key
    },
    UpdateExpression: "SET Quantity = :newQuantity",
    ExpressionAttributeValues: {
      ":newQuantity": newQuantity, // Convert number to string for DynamoDB
    },
  };

  try {
    await docClient.send(new UpdateCommand(params));
    console.log(`Updated quantity for product ${productPK} to ${newQuantity}`);
  } catch (error) {
    console.error("Failed to update product quantity:", error);
    throw new Error("Failed to update product quantity");
  }
}

async function OnHandCreate(productId, OnHandPK, OnHandDetails, sanitizedCompanyName) {
  console.log(
    "From model",
    productId,
    OnHandPK,
    OnHandDetails,
    OnHandDetails.Quantity
  );

  // Check if the item with PK starting with 'ONHAND#' and given SK exists
  const scanParams = {
    TableName:`${sanitizedCompanyName}-InventoryOnHand`,
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
        TableName:`${sanitizedCompanyName}-InventoryOnHand`,
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
        TableName: `${sanitizedCompanyName}-InventoryOnHand`,
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

module.exports = {
  InventoryTransaction,
  getProductsByName,
  updateProductQuantity,
  OnHandCreate,
};
