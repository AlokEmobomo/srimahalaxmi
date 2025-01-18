const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
  //   endpoint: "http://localhost:8000",
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "Tender";

async function create(projectPK, lineItemId, userPK, lineItemDetails,tableName){
  console.log(projectPK, lineItemId, userPK, lineItemDetails);
  const params = {
    TableName: tableName,
    Item: {
      ...lineItemDetails,
      PK: lineItemId,
      SK: projectPK,
      userPK: userPK,
      RemoveFlag:1,
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

module.exports = { create};
