const {
  create,
} = require("./CreateOnHandModel");

exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const { productId, ProductName, Quantity, Comments, userPK, sanitizedCompanyName } = body;
  const timestamp = Date.now(); // Current timestamp in milliseconds
  const OnHandPK = `ONHAND#${timestamp}`;
  const creationDate =new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });

  const OnHandDetails = {
    userPK,
    ProductName,
    Quantity: Quantity,
    Comments,
    EntityType: "OnHand",
    CreationDate: creationDate,
  };

  try {
    // Call the model function to create a line item in the database
    const OnHandresult = await create(productId, OnHandPK, OnHandDetails, sanitizedCompanyName);
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
        message: "Onhand has been created successfully",
        OnHandresult,
      }),
    };
  } catch (error) {
    console.error("Error creating Product: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error creating Product",
        error: error.message,
      }),
    };
  }
};
