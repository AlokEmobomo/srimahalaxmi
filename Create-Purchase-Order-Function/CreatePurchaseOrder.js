const { create } = require("./CreatePurchaseOrderModel");
const decodeToken = require("./decodeToken");

const AWS = require("aws-sdk");
const lambda = new AWS.Lambda();

exports.handler = async (event) => {
  console.log("HI");
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

  const tableName = `${sanitizedCompanyName}-Purchase-Reciept-Order`;


  console.log("Received event:", JSON.stringify(event, null, 2));
  console.log("userPK from token:", userPK);

  // Parse the request body
  const body = JSON.parse(event.body);
  const { projectPK, tenderPK, PurchaseOrderNumber, VendorName, ...values } =
    body;
  const timestamp = Date.now(); // Current timestamp in milliseconds
  const PurchaseOrderId = `PO#${timestamp}`;
  const creationDate = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  // Construct the line item details
  const PurchaseOrderDetails = {
    userPK,
    EntityType: "PurchaseOrder", // Set EntityType to "LineItem"
    tenderPK,
    PurchaseOrderNumber,
    VendorName,
    CreationDate: creationDate,
    Values: values, // All remaining fields under 'Values'
  };

  try {
    // Call the model function to create a line item in the database
    const result = await create(
      projectPK,
      PurchaseOrderId,
      userPK,
      tenderPK,
      VendorName,
      PurchaseOrderDetails,
      tableName
    );

    const AutoIncrementParams = {
      FunctionName:
        "arn:aws:lambda:ap-south-1:345594590006:function:PurchaseAutoIncrementFunction:Dev",
      InvocationType: "RequestResponse",
      Payload: JSON.stringify({
      sanitizedCompanyName
    }),

    };

    const AutoIncrementResponse = await lambda
      .invoke(AutoIncrementParams)
      .promise();
    if (AutoIncrementResponse.StatusCode !== 200) {
      console.warn(
        `Auto Increment invocation failed with status code: ${AutoIncrementResponse.StatusCode}`
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        PurchaseOrderId: PurchaseOrderId,
        message: "Purchase Order has been created successfully",
        result,
        IncrementResult: JSON.parse(AutoIncrementResponse.Payload),
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
