const { create, TransactionCreate, OnHandCreate } = require("./CreateProductModel");
const decodeToken = require("./decodeToken");

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

  const tableName = `${sanitizedCompanyName}-Product`;

  console.log("Received event:", JSON.stringify(event, null, 2));
  console.log("userPK from token:", userPK);

  // Check if event.body is already an object
  let body;
  if (typeof event.body === "string") {
    body = JSON.parse(event.body);  // If it's a string, parse it
  } else {
    body = event.body;  // If it's already an object, use it directly
  }

  const { MaterialName, Quantity, Grade, Dimension, MaterialId,WorkOrderId, Comments } = body;
  const timestamp = Date.now(); // Current timestamp in milliseconds
  const MaterialPK = `MT#${timestamp}`;
  const OnHandPK = `ONHAND#${timestamp}`;
  const InventoryTransactionId = `INVTRANS#${timestamp}`;
  const creationDate = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  const MaterialDetails = {
    userPK,
    MaterialName,
    Quantity,
    Grade,
    Dimension,
    Comments,
    MaterialId,
    EntityType: "Material", 
    CreationDate: creationDate, 
    Name: MaterialId,
  };

  const TransactionDetails = {
    userPK,
    Name: MaterialId,
    WorkOrderId:WorkOrderId,
    OnhandQuantity: Quantity,
    ProductQuantity: 0,
    ReceiptQuantity: Quantity,
    Type: "From Material Creation",
    EntityType: "InventoryTransaction",
    CreationDate: creationDate,
    GSI: MaterialPK,
  };

  const OnHandDetails = {
    userPK,
    ProductName: MaterialId,
    Quantity: Quantity,
    EntityType: "OnHand",
    CreationDate: creationDate,
    Comments: "From Product Creation",
  };

  try {
    // Call the model function to create a line item in the database
    const result = await create(MaterialPK, userPK, MaterialDetails, tableName);

    const OnHandresult = await OnHandCreate(MaterialPK, OnHandPK, OnHandDetails, sanitizedCompanyName);

    const TransactionResult = await TransactionCreate(
      InventoryTransactionId,
      OnHandPK,
      TransactionDetails,
      sanitizedCompanyName
    );


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
        message: "Product has been created successfully",
        result,
        TransactionResult,
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
