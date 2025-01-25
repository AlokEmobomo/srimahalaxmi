const { DynamoDBClient, DescribeTableCommand, UpdateTableCommand   } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

// Create DynamoDB Document Client
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "In-Out-Source";

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

async function getAllOutSource(userPK, tableName) {
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

    // Query the GSI
    const params = {
      TableName: tableName,
      IndexName: indexName,
      KeyConditionExpression: "EntityType = :entityType AND userPK = :userPK",
      ExpressionAttributeValues: {
        ":entityType": "OutSource",
        ":userPK": userPK,
      },
    };

    const result = await docClient.send(new QueryCommand(params));

    // Sort items by timestamp in descending order
    const sortedItems = (result.Items || [])
      .filter(item => item.RemoveFlag === 1)
      .sort((a, b) => {
        const timestampA = parseInt(a.PK.split("#")[1]);
        const timestampB = parseInt(b.PK.split("#")[1]);
        return timestampB - timestampA;
      });

    return { success: true, data: sortedItems };
  } catch (error) {
    console.error("Error in getAllOutSource:", error);
    return { success: false, message: error.message };
  }
}




module.exports = { getAllOutSource };
