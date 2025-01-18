const { create } = require("./create-picklist-model");
const decodeToken = require("./decodeToken");

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = String(date.getFullYear()).slice(-2);

    return `${month}-${day}-${year}`;
}

// Get the current date
const currentDate = new Date();

// Format the current date
const formattedDate = formatDate(currentDate);

exports.handler = async (event) => {
    const authHeader =
        event.headers.Authorization || event.headers.authorization;

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

    console.log("Received event:", JSON.stringify(event, null, 2));
    console.log("userPK from token:", userPK);

    // Parse the request body
    const body = JSON.parse(event.body);
    const { PicklistName, Options, Status } = body;
    const timestamp = Date.now(); // Current timestamp in milliseconds
    const PicklistId = `PL#${timestamp}`;
    const creationDate = new Date().toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });

    try {
        // Call the model function to create a line item in the database
        const result = await create(PicklistName, Status, userPK, Options, PicklistId, creationDate);
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
                message: "Picklist has been created successfully",
                result,
            }),
        };
    } catch (error) {
        console.error("Error creating PickList: ", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Error creating PickList",
                error: error.message,
            }),
        };
    }
};
