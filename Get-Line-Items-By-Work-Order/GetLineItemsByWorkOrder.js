const {
  getLineItemsByOutSource,
  getOutSourceById,
} = require("./GetLineItemsByWorkOrderModel");
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

  const tableName = `${sanitizedCompanyName}-In-Out-Source`;

  console.log("Received event:", JSON.stringify(event, null, 2));
  console.log("userPK from token:", userPK);
  // Extract query parameters from event
  const { OutSourcePK } = event.queryStringParameters || {};
  console.log("Query Parameters:", event.queryStringParameters);

  try {
    // Fetch line items associated with the project
     const OutSourceResponse = await getOutSourceById(OutSourcePK, tableName);

    const LineItemsResponse = await getLineItemsByOutSource(
      OutSourcePK,
      userPK,
      tableName
    );

    if (!LineItemsResponse.success) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          message: LineItemsResponse.message,
        }),
      };
    }

    // LineItemsResponse.data should already contain the project details
    const lineItems = LineItemsResponse.data;

    // Respond with the data
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        LineItems: lineItems,
        OutSource: OutSourceResponse,
      }),
    };
  } catch (error) {
    console.error("Error fetching line items", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Server error",
      }),
    };
  }
};
