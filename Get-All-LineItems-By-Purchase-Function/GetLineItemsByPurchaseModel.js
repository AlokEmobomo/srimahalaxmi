const { DynamoDBClient, DescribeTableCommand, UpdateTableCommand} = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

// CREATE DYNAMODB  DOCUMENT CLIENT

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "Purchase-Reciept-Order";

async function getLineItemsByPurchase(purchaseOrderId, userPK, tableName) {
  const indexName = "GSI_SK";
  const partitionKey = "SK";
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
    IndexName: indexName, // GSI where SK is the partition key and userPK is the sort key
    KeyConditionExpression: "SK = :sk and userPK = :userpk",
    FilterExpression: "begins_with(PK, :pkPrefix)", // Additional condition to match PK prefix
    ExpressionAttributeValues: {
      ":sk": purchaseOrderId, // The value for SK
      ":userpk": userPK, // The value for userPK
      ":pkPrefix": `${purchaseOrderId}#L`, // The prefix for PK
    },
  };

  
    const data = await docClient.send(new QueryCommand(params));
    return { success: true, data: data.Items || null };
  } catch (err) {
    console.error("Unable to get details by SK and userPK", err);
    return { success: false, message: err.message };
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


module.exports = { getLineItemsByPurchase };
