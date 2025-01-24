const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

// CREATE DYNAMODB  DOCUMENT CLIENT

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "Purchase-Reciept-Order";

async function create(
  ReceiptLineItemPK,
  ReceiptId,
  PurchaseOrderLineId,
  userPK,
  ReceiptLineItemDetails,
  tableName
) {
  console.log(
    ReceiptLineItemPK,
    ReceiptId,
    PurchaseOrderLineId,
    userPK,
    ReceiptLineItemDetails
  );
  const params = {
    TableName: tableName,
    Item: {
      ...ReceiptLineItemDetails,
      PK: ReceiptLineItemPK,
      SK: ReceiptId,
      userPK: userPK,
      GSI: PurchaseOrderLineId,
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    return { success: true, message: "LineItem Added Successfully" };
  } catch (err) {
    console.log("Unable to add LineItem", err);
    return { success: false, message: err.message };
  }
}

module.exports = { create };
