const { create } = require("./CreateReceiptLineItemsModel");
const decodeToken = require("./decodeToken");

const AWS = require("aws-sdk");
const lambda = new AWS.Lambda();

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

  const tableName = `${sanitizedCompanyName}-Purchase-Reciept-Order`;


  console.log("Received event:", JSON.stringify(event, null, 2));
  console.log("userPK from token:", userPK);

  let body;
  console.log(event);

  try {
    // Check and parse the request body
    if (event.body) {
      body = JSON.parse(event.body);
    } else {
      throw new Error("Request body is missing");
    }
  } catch (error) {
    console.error("Error parsing request body: ", error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Invalid or missing JSON body",
        error: error.message,
      }),
    };
  }

  const {
    ReceiptLineNo,
    ReceiptId,
    PurchaseOrderLineId,
    Name,
    MaterialId, 
    ReceiptQuantity,
    WorkOrderId,
    ...values
  } = body;

  const ReceiptLineItemPK = `${ReceiptId}#L${ReceiptLineNo}`;

  // Construct the line item details
  const ReceiptLineItemDetails = {
    userPK,
    EntityType: "ReceiptLineItem", // Set EntityType to "LineItem"
    CreationDate: new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }), 
    Name,
    WorkOrderId,
    Values: { ...values, ReceiptQuantity, ReceiptLineNo, MaterialId }, 
  };

  try {
    // Call the model function to create a line item in the database
    const result = await create(
      ReceiptLineItemPK,
      ReceiptId,
      PurchaseOrderLineId,
      userPK,
      ReceiptLineItemDetails,
      tableName
    );

    const lambdaParams = {
      FunctionName:
        "arn:aws:lambda:ap-south-1:345594590006:function:Inventory-Receipt-Transaction-Function:Dev", // Replace with the actual Lambda function name
      InvocationType: "RequestResponse", // Use "Event" for asynchronous invocation if desired
      Payload: JSON.stringify({
        ReceiptLineItemId: ReceiptLineItemPK, // Passing the receipt line item ID
        ReceiptId,
        ProductName: MaterialId,
        userPK,
        ReceiptQuantity,
        WorkOrderId,
        sanitizedCompanyName
      }),
    };

    const lambdaResponse = await lambda.invoke(lambdaParams).promise();

    // Check the status code from the response
    if (lambdaResponse.StatusCode !== 200) {
      throw new Error(
        `Lambda invocation failed with status code: ${lambdaResponse.StatusCode}`
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Receipt LineItem has been created successfully",
        result,
        lambdaResponse: JSON.parse(lambdaResponse.Payload), // Parse response from the invoked Lambda
      }),
    };
  } catch (error) {
    console.error("Error creating Receipt line item: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error creating line item",
        error: error.message,
      }),
    };
  }
};
