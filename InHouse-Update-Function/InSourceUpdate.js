const { updateInHouse } = require("./InSourceUpdateModel");
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

  const body = JSON.parse(event.body);
  const { WorkOrderPK, Status, GatePass, VendorName,ReturnStatus, Date } = body; // Extract necessary fields

  const updatedFields = {
    Status,
    GatePass,
    VendorName,
    Date,
    ReturnStatus
  };

  try {
    // Call the update method in the model to update the line item
    const result = await updateInHouse(WorkOrderPK, updatedFields, tableName);


     const lambdaParams = {
       FunctionName:
         "arn:aws:lambda:ap-south-1:345594590006:function:WorkOrderTransactionsFunction:Dev",
       InvocationType: "RequestResponse", // Use "Event" for asynchronous invocation if desired
       Payload: JSON.stringify({
         In_Out_SourcePK: WorkOrderPK,
         GatePass: GatePass,
         userPK: userPK,
         VendorName: VendorName,
         Type: Status,
         OutSourceDate: Date,
         tableName:tableName,
       }),
     };

     const lambdaResponse = await lambda.invoke(lambdaParams).promise();

     if (lambdaResponse.StatusCode !== 200) {
       throw new Error(
         `Lambda invocation failed with status code: ${lambdaResponse.StatusCode}`
       );
     }

    if (result.success) {
      // Return success response with updated data
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Work Order updated successfully",
          updatedData: result.data,
          lambdaResponse,
        }),
      };
    } else {
      // Return error message if update fails
      return {
        statusCode: 500,
        body: JSON.stringify({ message: result.message }),
      };
    }
  } catch (error) {
    console.error("Error updating Product:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error updating Product", error }),
    };
  }
};
