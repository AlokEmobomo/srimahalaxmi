const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "Tender";

async function GetLineItemsByVenderWhenBuy(ProjectPK, VendorName, tableName) {
  const params = {
    TableName: tableName,
    IndexName: "GSI_SK", // Use the Global Secondary Index (GSI)
    KeyConditionExpression: "SK = :projectPK",
    ExpressionAttributeValues: {
      ":projectPK": ProjectPK, // The value for the SK (partition key in the GSI)
    },
  };

  try {
    // Query DynamoDB for items by ProjectPK
    const data = await docClient.send(new QueryCommand(params));

    // Filter line items by VendorName and Buy status
    const filteredLineItems = data.Items.filter((item) => {
      const values = item.Values || {}; // Safely access Values
      const vendorNames = Array.isArray(values.VendorName)
        ? values.VendorName // Use array if VendorName is an array
        : [values.VendorName]; // Wrap single value in an array for consistent processing

      return (
        vendorNames.includes(VendorName) && // Check if VendorName matches any name in the array
        values.MakeBuy === "Buy" // Ensure MakeBuy is "Buy"
      );
    });

    return filteredLineItems; // Return only filtered items for further processing
  } catch (error) {
    throw new Error("Error fetching line items: " + error.message); // Throw error to handle in the Lambda function
  }
}

module.exports = {
  GetLineItemsByVenderWhenBuy,
};
