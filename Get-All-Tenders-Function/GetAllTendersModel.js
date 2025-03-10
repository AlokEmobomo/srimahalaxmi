const { DynamoDBClient, DescribeTableCommand, UpdateTableCommand} = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "Tender";

async function getAllTenders(userPK,tableName) {
  const indexName = "EntityTypeIndex";
  const partitionKey = "EntityType";
  const sortKey = "userPK";

  try {
    const isGSIActive = await checkAndCreateGSI(tableName, indexName, partitionKey, sortKey);

    // Wait for GSI to become active if not already active
    if (!isGSIActive) {
      await waitForGSIActivation(tableName, indexName);
    }
  const params = {
    TableName: tableName,
    IndexName: indexName, 
    KeyConditionExpression: "EntityType = :entityType AND userPK = :userPK",
    ExpressionAttributeValues: {
      ":entityType": "Tender",
      ":userPK": userPK,
    },
  };

  
    const result = await docClient.send(new QueryCommand(params));

    // Filter and sort items in descending order based on the timestamp extracted from PK
    const filteredAndSortedItems = (result.Items || [])
      .filter(item => item.RemoveFlag === 1) // Check RemoveFlag is 1
      .sort((a, b) => {
        const timestampA = parseInt(a.PK.split("#")[1]);
        const timestampB = parseInt(b.PK.split("#")[1]);
        return timestampB - timestampA;
      });

    return { success: true, data: filteredAndSortedItems }; // Return filtered and sorted items
  } catch (err) {
    console.log("Unable to fetch tenders", err);
    return { success: false, message: err.message, userPK };
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


module.exports = { getAllTenders };
