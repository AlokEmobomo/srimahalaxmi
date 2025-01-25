const { create, getProductsByName } = require("./CreateWorkOrdersModel");
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

  const tableName = `${sanitizedCompanyName}-WorkOrder`;

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

  const { ProductName, WorkOrderQuantity, PoNumber, WorkOrderId, ...values } =
    body;

  const timestamp = Date.now(); // Current timestamp in milliseconds

  const WorkOrderPK = `WO#${timestamp}`;

  // Construct the line item details
  const WorkOrderDetails = {
    EntityType: "Work Order", // Set EntityType to "LineItem"
    creationDate :new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
    WorkOrderId,
    PoNumber,
    Values: { ...values }, // All remaining fields under 'Values'
  };

  // Retrieve product details using ProductName
  const productDetailsResult = await getProductsByName(ProductName, sanitizedCompanyName);
  console.log(productDetailsResult)

  if (!productDetailsResult.success) {
    throw new Error(
      `Error retrieving product details: ${productDetailsResult.message}`
    );
  }

  // Get ProductQuantity from productDetails
  const ProductPK = productDetailsResult.products[0].PK;
  const ProductQuantity = Number(productDetailsResult.products[0].Quantity); // Convert to number
  const WorkOrderQty = Number(WorkOrderQuantity);

  // Validate the quantities
  if (isNaN(ProductQuantity) || isNaN(WorkOrderQty)) {
    throw new Error(
      "Invalid quantity values: ProductQuantity and WorkOrderQuantity must be valid numbers."
    );
  }

  console.log(
    "ProductQuantity:",
    ProductQuantity,
    "WorkOrderQuantity:",
    WorkOrderQty
  );

  // Calculate OnhandQuantity (ProductQuantity - WorkOrderQuantity)
  const OnhandQuantity = ProductQuantity - WorkOrderQty;
  console.log("OnhandQuantity:", OnhandQuantity);

  // Check if OnhandQuantity is negative
  if (OnhandQuantity < 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        message: "Not enough inventory.",
      }),
    };
  }

  try {
    const result = await create(
      WorkOrderPK,
      ProductPK,
      ProductName,
      WorkOrderQty,
      OnhandQuantity,
      userPK,
      WorkOrderDetails,
       tableName
    );

    // // After successful creation, invoke another Lambda function
    const lambdaParams = {
      FunctionName:
        "arn:aws:lambda:ap-south-1:345594590006:function:Inventory-Work-Order-Transaction-Function:Dev", 
      InvocationType: "RequestResponse", 
      Payload: JSON.stringify({
        WorkOrderPK,
        ProductPK,
        ProductName,
        ProductQuantity,
        WorkOrderQty,
        OnhandQuantity,
        userPK,
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
        message: "Work Order has been created successfully",
        result,
        lambdaResponse: JSON.parse(lambdaResponse.Payload), // Parse response from the invoked Lambda
      }),
    };
  } catch (error) {
    console.error("Error creating Work Order: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error creating Work Order",
        error: error.message,
      }),
    };
  }
};
