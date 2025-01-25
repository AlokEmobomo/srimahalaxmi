const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
  QueryCommand
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const tableName = "S3DyamobdFile";


async function getS3AttachmentsById(s3Id) {
  console.log(s3Id);

  let params = {
    TableName: tableName,
    IndexName: "GSI_SK", // Name of the GSI where SK is the partition key
    ExpressionAttributeValues: {
      ":sk": s3Id,
    },
  };

  try {
    // Determine if query or scan is needed
    if (s3Id === "FLE") {
      // Use a Scan for partial matching as SK is the partition key
      params = {
        TableName: tableName,
        IndexName: "GSI_SK",
        FilterExpression: "begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":sk": s3Id,
        },
      };

      console.log("Scanning Parameters:", params);
      const data = await docClient.send(new ScanCommand(params)); // Use ScanCommand
      console.log("Scan Result:", data);

      const processedData = (data.Items || []).map(processItem);
      return { success: true, data: processedData };
    } else {
      // Use a Query for exact matching
      params.KeyConditionExpression = "SK = :sk";
      console.log("Query Parameters:", params);

      const data = await docClient.send(new QueryCommand(params));
      console.log("Query Result:", data);

      const processedData = (data.Items || []).map(processItem);
      return { success: true, data: processedData };
    }
  } catch (err) {
    console.error("Unable to query projects", err);
    return { success: false, message: err.message }; // Return the error message
  }
}

function processItem(item) {
  if (item.Location) {
    const filteredLocations = Object.entries(item.Location)
      .filter(([key, value]) => key !== "0" && value !== "0") // Remove "0" keys and values
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});

    // If filteredLocations is empty, return false to remove the item
    if (Object.keys(filteredLocations).length === 0) {
      return false; // Return false to signal that the item should be removed from the array
    }

    item.Location = filteredLocations; // Otherwise, update Location with valid entries
  }

  return item; // Return the modified item
}

// Example usage:
const items = [
  { Location: { "0": "0", "1": "validLocation" }, name: "Item 1" },
  { Location: { "0": "0" }, name: "Item 2" },
  { Location: null, name: "Item 3" },
  { Location: { "1": "validLocation" }, name: "Item 4" }
];

// Filter the array to remove items with invalid Location
const processedItems = items.filter(processItem);

console.log(processedItems);



module.exports = { getS3AttachmentsById };
