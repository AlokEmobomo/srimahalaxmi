const { DynamoDBClient, DescribeTableCommand, UpdateTableCommand } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

// CREATE DYNAMODB DOCUMENT CLIENT
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "Tender";

async function GetVendorNames(userPK, tableName) {
  const indexName = "EntityTypeIndex";
  const partitionKey = "EntityType";
  const sortKey = "userPK";


  try {
    // Ensure GSI exists
    const isGSIActive = await checkAndCreateGSI(tableName, indexName, partitionKey, sortKey);

    // Wait for GSI to become active if not already active
    if (!isGSIActive) {
      await waitForGSIActivation(tableName, indexName);
    }

  const params = {
    TableName: tableName,
    IndexName: indexName,
    KeyConditionExpression: "EntityType = :entityType AND userPK = :userPK",
    FilterExpression: "RemoveFlag = :removeFlag", // Filter by RemoveFlag = 1
    ExpressionAttributeValues: {
      ":entityType": "LineItem",
      ":userPK": userPK,
      ":removeFlag": 1, // Ensure RemoveFlag is 1
    },
  };

    // Query the DynamoDB table using GSI
    const data = await docClient.send(new QueryCommand(params));
    console.log(data);

    // Check if items exist
    if (data.Items && data.Items.length > 0) {
      const vendorMap = new Map(); // To store unique vendors and their LineItems

      // Loop through each LineItem
      data.Items.forEach((item) => {
        if(item.Values?.MakeBuy === "Buy"){
          const vendorNames = item.Values?.VendorName;

          if (vendorNames) {
            const vendorsArray = Array.isArray(vendorNames)
              ? vendorNames
              : [vendorNames]; // Normalize to array

            vendorsArray.forEach((vendorName) => {
              if (vendorMap.has(vendorName)) {
                // If vendor already exists, add to the array of LineItems
                vendorMap.get(vendorName).LineItems.push({
                  PK: item.PK,
                  SK: item.SK,
                });
              } else {
                // Otherwise, create a new entry
                vendorMap.set(vendorName, {
                  VendorName: vendorName,
                  LineItems: [
                    {
                      PK: item.PK,
                      SK: item.SK,
                    },
                  ],
                });
              }
            });
          }

        }
      });

      // Convert Map to array for response
      const vendorList = Array.from(vendorMap.values());

      return {
        success: true,
        LineItems: vendorList,
      };
    } else {
      return {
        success: true,
        LineItems: [],
      };
    }
  } catch (error) {
    console.error("Error fetching vendor names from GSI:", error);
    return {
      success: false,
      message: "Error fetching data from DynamoDB.",
      error: error.message,
    };
  }
}

async function checkAndCreateGSI(tableName, indexName, partitionKey, sortKey) {
  try {
    // Check if the GSI exists
    const result = await dynamoDBClient.send(new DescribeTableCommand({ TableName: tableName }));
    const gsis = result.Table.GlobalSecondaryIndexes || [];
    const existingGSI = gsis.find(index => index.IndexName === indexName);

    if (existingGSI) {
      if (existingGSI.IndexStatus === "ACTIVE") {
        console.log(`GSI ${indexName} already exists and is ACTIVE.`);
        return true; // GSI exists and is active
      } else {
        console.log(`GSI ${indexName} exists but is in status: ${existingGSI.IndexStatus}`);
        return false; // GSI exists but is not active
      }
    } else {
      console.log(`GSI ${indexName} does not exist. Creating...`);

      // Add GSI for PAY_PER_REQUEST billing mode
      const updateParams = {
        TableName: tableName,
        AttributeDefinitions: [
          { AttributeName: partitionKey, AttributeType: "S" },
          { AttributeName: sortKey, AttributeType: "S" },
        ],
        GlobalSecondaryIndexUpdates: [
          {
            Create: {
              IndexName: indexName,
              KeySchema: [
                { AttributeName: partitionKey, KeyType: "HASH" },
                { AttributeName: sortKey, KeyType: "RANGE" },
              ],
              Projection: { ProjectionType: "ALL" },
            },
          },
        ],
      };

      await dynamoDBClient.send(new UpdateTableCommand(updateParams));
      console.log(`GSI ${indexName} creation initiated.`);
      return false; // GSI creation initiated, but not active yet
    }
  } catch (error) {
    console.error("Error checking or creating GSI:", error);
    throw error;
  }
}


async function waitForGSIActivation(tableName, indexName) {
  let isActive = false;
  while (!isActive) {
    const result = await dynamoDBClient.send(new DescribeTableCommand({ TableName: tableName }));
    const gsis = result.Table.GlobalSecondaryIndexes || [];
    const index = gsis.find(gsi => gsi.IndexName === indexName);

    if (index && index.IndexStatus === "ACTIVE") {
      isActive = true;
      console.log(`GSI ${indexName} is now ACTIVE.`);
    } else {
      console.log(`Waiting for GSI ${indexName} to become ACTIVE...`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds
    }
  }
}

module.exports = {
  GetVendorNames,
};
