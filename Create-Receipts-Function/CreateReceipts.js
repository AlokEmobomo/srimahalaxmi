const { create } = require("./CreateReceiptsModel");
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

  // Parse the request body
  const body = JSON.parse(event.body);
  const { ReceiptNo, VendorId, ...values } = body;
  const timestamp = Date.now(); // Current timestamp in milliseconds
  const ReceiptId = `REC#${timestamp}`;
  const creationDate = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  // Construct the line item
  const ReceiptDetails = {
    userPK,
    Name: ReceiptNo,
    CreationDate: creationDate,
    EntityType: "ReceiptHeader", // Set EntityType to "PurchaseOrder"
    Values: {
      ...values, // Spread the  'values' object
      CreatedBy: userPK, // Add CreatedexistingBy to 'Values'
      UpdatedBy: userPK,
      ReceiptNo, // Add UpdatedBy to 'Values'
    },
  };

  try {
    // Call the model function to create a line item in the database
    const result = await create(ReceiptId, userPK, ReceiptDetails, tableName);

    const AutoIncrementParams = {
      FunctionName:
        "arn:aws:lambda:ap-south-1:345594590006:function:receipt-pdf-work-order-function:Dev",
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
        message: "Receipt has been created successfully",
        result,
        ReceiptId: ReceiptId,
        IncrementResult: JSON.parse(AutoIncrementResponse.Payload),
      }),
    };
  } catch (error) {
    console.error("Error creating Receipt: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error creating Receipt",
        error: error.message,
      }),
    };
  }
};
