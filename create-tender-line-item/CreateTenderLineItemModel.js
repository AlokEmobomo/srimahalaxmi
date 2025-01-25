const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");


const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

// CREATE DYNAMODB  DOCUMENT CLIENT

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "Tender";

async function create(tenderPK, lineItemId, userPK, lineItemDetails, tableName){
  console.log(tenderPK, lineItemId, userPK, lineItemDetails);
  const params = {
    TableName: tableName,
    Item: {
      ...lineItemDetails,
      PK: lineItemId,
      SK: tenderPK,
      userPK: userPK,
      RemoveFlag:1,
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    return { success: true, message: "TenderLineItem Added Successfully" };
  } catch (err) {
    console.log("Unable to add LineItem", err);
    return { success: false, message: err.message };
  }
}

module.exports = { create };
