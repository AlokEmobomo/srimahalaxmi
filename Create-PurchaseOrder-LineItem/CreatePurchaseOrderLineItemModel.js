const { DynamoDBClient, DescribeTableCommand, UpdateTableCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "Purchase-Reciept-Order";

const lambdaClient = new LambdaClient();

async function create(
  PurchaseOrderId,
  PurchaseOrderIdLineItemId,
  userPK,
  PurchaseOrderLineItemDetails,
  tableName
) {
  console.log( PurchaseOrderId,
    PurchaseOrderIdLineItemId,
    userPK,
    PurchaseOrderLineItemDetails)
  const params = {
    TableName: tableName,
    Item: {
      ...PurchaseOrderLineItemDetails,
      PK: PurchaseOrderIdLineItemId,
      SK: PurchaseOrderId,
      userPK: userPK,
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    return {
      success: true,
      message: "Purchase Order Line Item Added Successfully",
    };
  } catch (err) {
    console.log("Unable to add Project", err);
    return { success: false, message: err.message };
  }
}

async function checkAndCreateProduct(MaterialId, userPK, productDetails, token, sanitizedCompanyName) {

  const tableName = `${sanitizedCompanyName}-Product`;
  const partitionKey = "MaterialId";
  const sortKey = "userPK";
  const indexName = "materialIdUserPKIndex"; // Your GSI name

  try {
     // Ensure GSI exists
     const isGSIActive = await checkAndCreateGSI(tableName, indexName, partitionKey, sortKey);

     // Wait for GSI to become active if not already active
     if (!isGSIActive) {
       await waitForGSIActivation(tableName, indexName);
     }
  // Check if MaterialId exists
  const queryParams = {
    TableName: tableName,
    IndexName: indexName,
    KeyConditionExpression: "MaterialId = :materialId AND userPK = :userPK",
    ExpressionAttributeValues: {
      ":materialId": MaterialId,
      ":userPK": userPK,
    },
  };

 
    const result = await docClient.send(new QueryCommand(queryParams));

    if (result.Items.length > 0) {
      // MaterialId exists
      return { exists: true, created: false };
    } else {
      // MaterialId does not exist, invoke the `create-Product Function`
      const lambdaPayload = {
        MaterialName: productDetails.MaterialName,
        Quantity: 0,
        Grade: productDetails.Grade,
        Dimension: productDetails.Dimension,
        MaterialId,
        WorkOrderId:productDetails.WorkOrderId,
        Comments: productDetails.Comments || "product From Purchase",
      };

      const invokeParams = {
        FunctionName: "arn:aws:lambda:ap-south-1:345594590006:function:Create-Product-Function:Dev", // Replace with your Lambda function ARN
        Payload: JSON.stringify({
          body: lambdaPayload,  // Your original payload
          headers: {            // Including Authorization headers here
            Authorization: `Bearer ${token}`
          },
        }),
        InvocationType: "RequestResponse", // Wait for response
        LogType: "Tail", // Get detailed logs
      };
      
      

      const invokeResult = await lambdaClient.send(
        new InvokeCommand(invokeParams)
      );
      const invokeResponse = JSON.parse(
        new TextDecoder().decode(invokeResult.Payload)
      );

      if (invokeResponse.statusCode === 200) {
        console.log(`Product created successfully via Lambda: ${MaterialId}`);
        return { exists: false, created: true };
      } else {
        console.error("Error creating product via Lambda:", invokeResponse);
        throw new Error("Error creating product via create-Product Function");
      }
    }
  } catch (error) {
    console.error("Error in checkAndCreateProduct:", error);
    throw error;
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


module.exports = { create, checkAndCreateProduct };
