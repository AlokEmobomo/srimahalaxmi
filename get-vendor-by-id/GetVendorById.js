const { getVendorById } = require("./GetVendorByIdModel");
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

  const tableName = `${sanitizedCompanyName}-Vendor`;

  const vendorId = event.pathParameters.id;

  console.log("Fetching vendor with ID:", vendorId);

  try {
    const result = await getVendorById(vendorId, tableName);

    console.log("API result:", result); // Log API response for debugging

    if (result.success && result.data.length > 0) {
      const vendor = result.data[0];
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: vendor,
        }),
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          message: "Vendor not found",
        }),
      };
    }
  } catch (error) {
    console.error("Error fetching vendor:", error); // Log error details

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "An error occurred while fetching the vendor.",
      }),
    };
  }
};
