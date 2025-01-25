const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const tableName = "S3DyamobdFile";

async function getS3AttachmentsById(s3IdPrefix) {
  console.log(s3IdPrefix);

  const params = {
    TableName: tableName,
    IndexName: "GSI_SK", // Optional if scanning an index
    FilterExpression: "begins_with(SK, :skPrefix)", // Filter condition
    ExpressionAttributeValues: {
      ":skPrefix": s3IdPrefix,
    },
  };

  try {
    const data = await docClient.send(new ScanCommand(params));
    return { success: true, data: data.Items || [] };
  } catch (err) {
    console.error("Unable to scan projects", err);
    return { success: false, message: err.message };
  }
}

module.exports = { getS3AttachmentsById };
