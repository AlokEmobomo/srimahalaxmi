const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "InventoryTransaction";

async function InventoryTransaction(
  InventoryTransactionId,
  WorkOrderPK,
  ProductName,
  ProductQuantity,
  WorkOrderQty,
  Date,
  OnhandQuantity,
  userPK,
  WorkOrderId,
  sanitizedCompanyName
) {
  const params = {
    TableName: `${sanitizedCompanyName}-InventoryTransaction`,
    Item: {
      PK: InventoryTransactionId,
      SK: WorkOrderPK,
      userPK: userPK,
      Name: ProductName,
      ProductQuantity: ProductQuantity,
      ReceiptQuantity: WorkOrderQty,
      WorkOrderId:WorkOrderId,
      CreationDate: Date,
      OnhandQuantity: OnhandQuantity,
      EntityType: "InventoryTransaction",
      Type: "WorkOrder",
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    return {
      success: true,
      message: "Work Order Inventory Transaction Added Successfully",
    };
  } catch (err) {
    console.log("Unable to add Work Order Inventory Transaction", err);
    return { success: false, message: err.message };
  }
}

async function updateProductQuantity(productPK, newQuantity , sanitizedCompanyName) {
  console.log(productPK, newQuantity);
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

module.exports = {
  InventoryTransaction,
  updateProductQuantity,
};
