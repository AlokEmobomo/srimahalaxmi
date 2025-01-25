const {
  create,
  TransactionCreate,
  OnHandCreate,
} = require("./CreateToolsModel");
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

  const tableName = `${sanitizedCompanyName}-Tools`;

  console.log("Received event:", JSON.stringify(event, null, 2));
  console.log("userPK from token:", userPK);

  // Parse the request body
  const body = JSON.parse(event.body);
  const { Name, Quantity, ...values } = body;
  const timestamp = Date.now(); // Current timestamp in milliseconds
  const ToolsId = `TOOL#${timestamp}`;
  const OnHandPK = `ONHAND#${timestamp}`;
  const InventoryTransactionId = `INVTRANS#${timestamp}`;
  const creationDate = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  // Construct the line item details
  const ToolsDetails = {
    userPK,
    Quantity,
    EntityType: "Tools", // Set EntityType to "LineItem"
    CreationDate: creationDate, // Set CreationDate to "12-8-24"
    Name,
    Values: values, // All remaining fields under 'Values'
  };

  const TransactionDetails = {
    userPK,
    Name: Name,
    OnhandQuantity: Quantity,
    ToolsQuantity: 0,
    ReceiptQuantity: Quantity,
    Type: "Tools Creation",
    EntityType: "ToolsInventoryTransaction",
    CreationDate: creationDate,
    GSI: ToolsId,
  };

  const OnHandDetails = {
    userPK,
    Name: Name,
    Quantity: Quantity,
    EntityType: "ToolsOnHand",
    CreationDate: creationDate,
  };

  try {
    // Call the model function to create a line item in the database
    const result = await create(ToolsId, userPK, ToolsDetails,tableName);

    const OnHandresult = await OnHandCreate(ToolsId, OnHandPK, OnHandDetails, tableName);

    const TransactionResult = await TransactionCreate(
      InventoryTransactionId,
      OnHandPK,
      TransactionDetails,
      tableName
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Tool has been created successfully",
        result,
        TransactionResult,
        OnHandresult,
      }),
    };
  } catch (error) {
    console.error("Error creating Tool: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error creating Tool",
        error: error.message,
      }),
    };
  }
};
