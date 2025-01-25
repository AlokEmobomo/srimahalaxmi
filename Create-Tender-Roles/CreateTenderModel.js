const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

// CREATE DYNAMODB  DOCUMENT CLIENT

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const tableName = "Tender";

async function create(tenderId, userPK, tenderDetails, creationDate) {
  const params = {
    TableName: tableName,
    Item: {
      ...tenderDetails,
      PK: tenderId,
      SK: tenderId,
      CreationDate: creationDate,
      userPK: userPK,
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    return {
      success: true,
      message: "Tender Added Successfully",
      PK: tenderId,
    };
  } catch (err) {
    console.log("Unable to add Tender", err);
    return { success: false, message: err.message };
  }
}

module.exports = { create };
