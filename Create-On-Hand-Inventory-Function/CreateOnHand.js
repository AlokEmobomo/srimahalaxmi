const {
  create,
  updateProductQuantity,
  TransactionCreate,
} = require("./CreateOnHandModel");
const decodeToken = require("./decodeToken");

exports.handler = async (event) => {
  const authHeader = event.headers.Authorization || event.headers.authorization;

  if (!authHeader) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Authorization header is missing"}),
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

  const tableName = `${sanitizedCompanyName}-InventoryOnHand`;

  console.log("Received event:", JSON.stringify(event, null, 2));
  console.log("userPK from token:", userPK);
  const body = JSON.parse(event.body);
  const { productId, ProductName, PoNumber, WorkOrderId, Quantity, Comments } =
    body;
  console.log(
    productId,
    ProductName,
    PoNumber,
    WorkOrderId,
    Quantity,
    Comments,
    userPK
  );
  const timestamp = Date.now(); // Current timestamp in milliseconds
  const OnHandPK = `ONHAND#${timestamp}`;
  const InventoryTransactionId = `INVTRANS#${timestamp}`;

  const updatedProduct = await updateProductQuantity(productId, Quantity,sanitizedCompanyName);
  console.log(updatedProduct.currentQuantity)
  const UpdatedQuantity = updatedProduct.data.Quantity;
  console.log("UpdatedQuantity:", UpdatedQuantity);
  const creationDate = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
  const currentQuantity = updatedProduct.currentQuantity;

  const TransactionDetails = {
    userPK,
    Name: ProductName,
    WorkOrderId: WorkOrderId,
    OnhandQuantity: UpdatedQuantity,
    ProductQuantity: currentQuantity,
    ReceiptQuantity: Quantity,
    Type: "OnHandForm",
    EntityType: "InventoryTransaction",
    CreationDate: creationDate,
    GSI: productId,
  };

  const OnHandDetails = {
    userPK,
    Name: ProductName,
    ProductName,
    WorkOrderId: WorkOrderId,
    PoNumber:PoNumber,
    Quantity: UpdatedQuantity,
    Comments,
    EntityType: "OnHand",
    CreationDate: creationDate,
  };

  try {
    // Call the model function to create a line item in the database
    const OnHandresult = await create(productId, OnHandPK, OnHandDetails, tableName);

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
        OnHandresult,
        TransactionResult,
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
