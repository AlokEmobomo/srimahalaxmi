  const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
  const {
    DynamoDBDocumentClient,
    QueryCommand,
  } = require("@aws-sdk/lib-dynamodb");

  const dynamoDBClient = new DynamoDBClient({
    region: "ap-south-1",
    // endpoint: "http://localhost:8000",
  });

  // CREATE DYNAMODB  DOCUMENT CLIENT

  const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

  const tableName = "Tender";


  
 async function getTenderById(tenderId, tableName) {
    console.log(`Fetching tender with ID: ${tenderId}`);

    const params = {
      TableName: tableName,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": tenderId,
      },
    };

    try {
      const data = await docClient.send(new QueryCommand(params));
      return { success: true, data: data || null };
    } catch (err) {
      console.error("Unable to get the item", err);
      return { success: false, message: err.message };
    }
  };

 module.exports = { getTenderById };