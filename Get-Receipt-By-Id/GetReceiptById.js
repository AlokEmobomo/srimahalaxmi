const { getReceiptById } = require("./GetReceiptByIdModule");
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

  const tableName = `${sanitizedCompanyName}-Purchase-Reciept-Order`;
  const receiptId = event.pathParameters.id;

  console.log("Fetching receipt with ID:", receiptId);

  try {
    const result = await getReceiptById(receiptId, tableName);

    if (result.success && result.data.Count > 0) {
      const receipt = result.data.Items[0];

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: receipt,
        }),
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          message: "Purchase not found",
        }),
      };
    }
  } catch (error) {
    console.error("Error fetching purchase", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Internal Server Error",
      }),
    };
  }
};
