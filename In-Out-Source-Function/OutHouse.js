const {
  create_WorkOrder,
  create_WorkOrder_LineItem,
} = require("./OutHouseModel");
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

  const decoded = decodeToken(token); // Provide your JWT secret key
  const userPK = decoded.UserId;
  const companyName = decoded.companyName;
  console.log(decoded.companyName);

  const sanitizedCompanyName = companyName
  .replace(/[\s&]/g, "")
  .replace(/[^a-zA-Z0-9]/g, "");

  const tableName = `${sanitizedCompanyName}-In-Out-Source`;

  console.log("Received event:", JSON.stringify(event, null, 2));
  console.log("userPK from token:", userPK);

  let body;
  try {
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

  const { GatePass, VendorName, VendorPK, Issued_Date,Received_Date, ReturnStatus, line_items, Status } =
    body;

  const timestamp = Date.now(); // Current timestamp in milliseconds
  const WorkOrderPK = `OS#${timestamp}`;
  const CreationDate = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  try {
    const workOrderResult = await create_WorkOrder(
      WorkOrderPK,
      GatePass,
      VendorName,
      ReturnStatus,
      CreationDate,
      Issued_Date,
      Received_Date, 
      Status,
      userPK,
      tableName,
    );

    const lineItemResults = [];

    for (const item of line_items) {
      const WorkOrderLineItemPK = `${WorkOrderPK}#L${item.SNO}`;

      const lineItemResult = await create_WorkOrder_LineItem(
        WorkOrderLineItemPK,
        WorkOrderPK,
        item.WorkOrderId,
        item.ProjectNumber,
        item.LineItemName,
        item.Quantity,
        CreationDate,
        item.SNO,
        item.Description,
        userPK,
        item.ItemCode,
        tableName
      );

      lineItemResults.push(lineItemResult);
    }

    const lambdaParams = {
      FunctionName:
        "arn:aws:lambda:ap-south-1:345594590006:function:WorkOrderTransactionsFunction:Dev",
      InvocationType: "RequestResponse", // Use "Event" for asynchronous invocation if desired
      Payload: JSON.stringify({
        In_Out_SourcePK: WorkOrderPK,
        GatePass: GatePass,
        userPK: userPK,
        VendorName: VendorName,
        WorkOrderId: line_items[0].WorkOrderId,
        Type: Status,
        OutSourceDate: Received_Date,
        tableName:tableName,
      }),
    };

    const lambdaResponse = await lambda.invoke(lambdaParams).promise();

    if (lambdaResponse.StatusCode !== 200) {
      throw new Error(
        `Lambda invocation failed with status code: ${lambdaResponse.StatusCode}`
      );
    }

    // Additional Lambda invocation, if needed
    const AutoIncrementParams = {
      FunctionName:
        "arn:aws:lambda:ap-south-1:345594590006:function:GatePassAutoIncrementFunction:Dev",
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
        message: "Work Order and Line Items have been created successfully",
        workOrderResult,
        lineItemResults,
        lambdaResponse: JSON.parse(lambdaResponse.Payload),
        autoIncrementLambdaResponse: JSON.parse(AutoIncrementResponse.Payload),
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
