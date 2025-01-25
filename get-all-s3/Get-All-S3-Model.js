const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
  //   endpoint: "http://localhost:8000",
});

// CREATE DYNAMODB  DOCUMENT CLIENT

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const tableName = "S3DyamobdFile";

async function getS3(userPK) {
  const params = {
    TableName: tableName,
  };

  try {
    const result = await docClient.send(new ScanCommand(params));
    return { success: true, data: result.Items };
  } catch (err) {
    console.log("Unable to fetch S3", err);
    return { success: false, message: err, userPK };
  }
}

module.exports = { getS3 };
