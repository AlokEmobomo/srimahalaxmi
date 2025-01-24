const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
  // endpoint: "http://localhost:8000",
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "Purchase-Reciept-Order";

async function create(ReceiptPK, userPK, ReceiptDetails, tableName) {
  const params = {
    TableName: tableName,
    Item: {
      ...ReceiptDetails,
      PK: ReceiptPK,
      SK: ReceiptPK,
      userPK: userPK,
      RemoveFlag:1
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    return { success: true, message: "Receipt Added Successfully" };
  } catch (err) {
    console.log("Unable to add Receipt", err);
    return { success: false, message: err.message };
  }
}

module.exports = { create };
