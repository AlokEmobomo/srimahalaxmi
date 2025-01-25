const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

// Initialize the DynamoDB client
const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

// Create DynamoDB Document Client
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "Tender"; // Ensure this matches your actual table name

async function GetProjectByVendor(skArray, userPK, tableName) {
  const promises = skArray.map(async (sk) => {
    const params = {
      TableName: tableName, // Use the correct table name variable
      KeyConditionExpression: "PK = :sk", // Only use the partition key
      ExpressionAttributeValues: {
        ":sk": sk,
        ":userPK": userPK, // Include userPK in the expression
      },
      FilterExpression: "userPK = :userPK", // Filter by userPK
    };

    try {
      // Query the DynamoDB table without using the index
      const data = await docClient.send(new QueryCommand(params));

      if (data.Items && data.Items.length > 0) {
        // Use a Set to remove duplicate PONumber values within each item
        const uniquePONumbers = Array.from(
          new Set(data.Items.map((item) => item.Values.PONumber).flat())
        );

        return {
          success: true,
          PK: data.Items[0].PK,
          SK: data.Items[0].SK,
          userPK: data.Items[0].userPK,
          PONumber: uniquePONumbers, // Return unique PONumber values
        };
      } else {
        return {
          success: false,
          SK: sk,
          message: "Project not found for SK: " + sk,
        };
      }
    } catch (error) {
      console.error("Error fetching project number by SK:", error);
      return {
        success: false,
        SK: sk,
        message: "Error fetching data from DynamoDB.",
        error: error.message,
      };
    }
  });

  // Wait for all promises to resolve
  const results = await Promise.all(promises);

  // Use a Set to remove duplicate items based on PK and SK
  const uniqueResults = Array.from(
    new Map(results.map((item) => [`${item.PK}#${item.SK}`, item])).values()
  );

  return uniqueResults;
}

module.exports = {
  GetProjectByVendor,
};
