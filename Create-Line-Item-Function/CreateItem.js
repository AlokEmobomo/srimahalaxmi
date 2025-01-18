const { create } = require("./CreateLineItemModel");
const decodeToken = require("./decodeToken");

// const AWS = require("aws-sdk");
// const lambda = new AWS.Lambda();

exports.handler = async (event) => {
  const authHeader = event.headers.Authorization || event.headers.authorization;

  if (!authHeader) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Authorization header is missing" }),
    };
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Token is missing" }),
    };
  }
  // Decode the token to get the userPK
  const decoded = decodeToken(token); // Provide your JWT secret key
  const userPK = decoded.UserId;
  const companyName = decoded.companyName;
  console.log(decoded.companyName);

  const sanitizedCompanyName = companyName
  .replace(/[\s&]/g, "")
  .replace(/[^a-zA-Z0-9]/g, "");

  const tableName = `${sanitizedCompanyName}-Tender-Project`;

  console.log("Received event:", JSON.stringify(event, null, 2));
  console.log("userPK from token:", userPK);
  // Parse the request body
  const body = JSON.parse(event.body);
  const { SNO, projectPK,  Description, ...values } = body;
  const lineItemId = `${projectPK}#L${SNO}`;
  const creationDate = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
  

  // Assign Name to Description in the values object
  values.Description = Description;
  values.SNO = SNO;

  const Name = Description;

  // Construct the line item details
  const lineItemDetails = {
    projectPK,
    userPK,
    EntityType: "LineItem", // Set EntityType to "LineItem"
    CreationDate: creationDate, 
    Name: Description,
    Values: values, // All remaining fields under 'Values'
  };

  try {

      // const lambdaParams = {
      //   FunctionName:
      //     "arn:aws:lambda:ap-south-1:345594590006:function:uploadfile", // Replace with the actual Lambda function name
      //   InvocationType: "RequestResponse", // Use "Event" for asynchronous invocation if desired
      //   Payload: JSON.stringify({
      //     SortKey: lineItemId,
      //     files,
      //     Type,
      //     Name,
      //     userPK,
      //   }),
      // };

      // const lambdaResponse = await lambda.invoke(lambdaParams).promise();

      // // Check the status code from the response
      // if (lambdaResponse.StatusCode !== 200) {
      //   throw new Error(`Lambda invocation failed with status code: ${lambdaResponse.StatusCode}`);
      // }
    // Call the model function to create a line item in the database


    const result = await create(projectPK, lineItemId, userPK, lineItemDetails, tableName);
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
        message: "LineItem has been created successfully",
        lineItemId,
        result,
        // lambdaResponse,
      }),
    };
  } catch (error) {
    console.error("Error creating line item: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error creating line item",
        error: error.message,
      }),
    };
  }
};