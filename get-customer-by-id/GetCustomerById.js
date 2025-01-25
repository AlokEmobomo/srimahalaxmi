const { getCustomerById } = require("./GetCustomerByIdModel");
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

  const customerId = event.pathParameters.id;

  console.log("Fetching Customer with ID:", customerId);

  try {
    const result = await getCustomerById(customerId, tableName);

    console.log("API result:", result); 

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
          message: "Customer not found",
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
