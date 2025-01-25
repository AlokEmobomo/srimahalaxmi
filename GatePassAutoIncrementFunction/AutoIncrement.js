const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);



exports.handler = async (event) => {

  const {sanitizedCompanyName} = event;

  const tableName =  `${sanitizedCompanyName}-Increment`;

  const primaryKey = {
    PK: "GATEPASSINCREMENT#1",
    SK: "GATEPASSINCREMENT#1",
  };

  // Step 1: Fetch the current IncrementValue
  const getParams = {
    TableName: tableName,
    Key: primaryKey,
    ProjectionExpression: "IncrementValue",
  };

  let currentIncrement;
  try {
    const result = await docClient.send(new GetCommand(getParams));
    currentIncrement = result.Item ? parseInt(result.Item.IncrementValue, 10) : 1; // Default to 1 if undefined
  } catch (err) {
    console.error("Error fetching IncrementValue:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Could not fetch IncrementValue",
      }),
    };
  }

  // Step 2: Calculate the next increment value
  const nextIncrement = !isNaN(currentIncrement) ? currentIncrement + 1 : 1;

  // Step 3: Update the increment value in DynamoDB
  const updateParams = {
    TableName: tableName,
    Key: primaryKey,
    UpdateExpression: "SET IncrementValue = :nextIncrement",
    ExpressionAttributeValues: {
      ":nextIncrement": nextIncrement,
    },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    const result = await docClient.send(new UpdateCommand(updateParams));
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Increment updated successfully",
        data: result.Attributes,
      }),
    };
  } catch (err) {
    console.error("Unable to update IncrementValue:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: err.message }),
    };
  }
};


