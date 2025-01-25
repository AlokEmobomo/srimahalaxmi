const { DynamoDBClient, DescribeTableCommand, UpdateTableCommand } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

// Initialize DynamoDB client outside the handler for better performance
const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

// Create DynamoDB document client
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "WorkOrder";
const LIMIT = 20; // Set a reasonable limit for the number of items per request

async function getAllWorkOrder(userPK, tableName, lastEvaluatedKey = null) {

  const indexName = "userPK-index";
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
    IndexName: indexName, // GSI with userPK as the partition key
    KeyConditionExpression: "userPK = :userpk",
    ExpressionAttributeValues: {
      ":userpk": userPK, // The value for userPK
    },
    // Limit: LIMIT, // Limit the number of items returned
    ScanIndexForward: false, // Retrieve items in descending order
  };

  // Only add ExclusiveStartKey if it's provided
  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = lastEvaluatedKey;
  }

    const data = await docClient.send(new QueryCommand(params));

    // Check if there are more items to fetch
    const hasMore = !!data.LastEvaluatedKey;

    // Sort items based on timestamp in descending order if necessary
    const sortedItems = (data.Items || []).sort((a, b) => {
      const timestampA = parseInt(a.PK.split("#")[1]);
      const timestampB = parseInt(b.PK.split("#")[1]);
      return timestampB - timestampA;
    });

    return {
      success: true,
      data: sortedItems,
      hasMore, // Indicates if more items are available
      lastEvaluatedKey: data.LastEvaluatedKey || null, // Return LastEvaluatedKey for pagination
    };
  } catch (err) {
    console.error("Unable to get Work Orders:", err);
    return {
      success: false,
      message: "Error fetching Work Orders. Please try again later.",
      error: err.message, // Return error details for debugging
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



module.exports = { getAllWorkOrder };
