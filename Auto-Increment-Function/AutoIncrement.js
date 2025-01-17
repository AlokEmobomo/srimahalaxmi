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

// const tableName = "Tender";

exports.handler = async (event) => {

  const {sanitizedCompanyName} = event
  const primaryKey = {
    PK: "TENDERINCREMENT#1",
    SK: "TENDERINCREMENT#1",
  };

  // Step 1: Fetch the current IncrementValue
  const getParams = {
    TableName:`${sanitizedCompanyName}-Increment`,
    Key: primaryKey,
    ProjectionExpression: "IncrementValue",
  };

  let currentIncrement;
  try {
    const result = await docClient.send(new GetCommand(getParams));
    currentIncrement = result.Item ? result.Item.IncrementValue : "A1"; // Default to "A1" if undefined
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
  let nextIncrement;

  // Extract the current letter and number
  const currentLetter = currentIncrement.charAt(0); // Extract the letter (A, B, ...)
  const currentNumber = parseInt(currentIncrement.slice(1), 10); // Extract the number (1, 2, ...)

  if (currentNumber < 10) {
    // Increment the number within the same letter
    nextIncrement = `${currentLetter}${currentNumber + 1}`;
  } else if (currentNumber >= 10 && currentNumber < 20) {
    // Move to the next set (11 to 20)
    nextIncrement = `${currentLetter}${currentNumber + 1}`;
  } else if (currentNumber === 20) {
    // Transition from any letter to the next letter and start at 11
    const nextLetter =
      currentLetter === "Z" ? "A" : String.fromCharCode(currentLetter.charCodeAt(0) + 1);
    nextIncrement = `${nextLetter}11`;
  } else {
    // If the current number is beyond 20, just increment normally
    const nextLetter =
      currentLetter === "Z" ? "A" : String.fromCharCode(currentLetter.charCodeAt(0) + 1);
    nextIncrement = `${nextLetter}${currentNumber + 1}`;
  }

  // Step 3: Update the increment value in DynamoDB
  const updateParams = {
    TableName: `${sanitizedCompanyName}-Increment`,
    Key: primaryKey,
    UpdateExpression: "SET IncrementValue = :nextIncrement",
    ExpressionAttributeValues: {
      ":nextIncrement": nextIncrement,
    },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    const result = await docClient.send(new UpdateCommand(updateParams));
    const endpoint = event.requestContext?.http?.path || "Unknown Endpoint";
    const method = event.requestContext?.http?.method || "Unknown Method";

  // Call the logs function
  const LogsParams = {
    FunctionName: "arn:aws:lambda:ap-south-1:345594590006:function:LogsFunction:Prod",
    InvocationType: "RequestResponse",
    Payload: JSON.stringify({
      companyName: sanitizedCompanyName,
      userId: userPK,
      endpoint,
      method,
      startTime: new Date().toISOString(),
      endTime: new Date(new Date().getTime() + 1000).toISOString(),
      dataProcessedKB: JSON.stringify(event.body).length / 1024,
    }),
  };

  const LogsResponse = await lambda.invoke(LogsParams).promise();
  if (LogsResponse.StatusCode !== 200) {
    console.warn(
      `Log function invocation failed with status code: ${LogsResponse.StatusCode}`
    );
  }
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
