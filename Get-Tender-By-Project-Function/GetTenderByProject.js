const { getProjectDetailsByPK } = require("./GetTenderByProjectModel"); 
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
  // const companyName = decoded.companyName;
  // console.log(decoded.companyName);

  // const sanitizedCompanyName = companyName
  // .replace(/[\s&]/g, "")
  // .replace(/[^a-zA-Z0-9]/g, "");

  // const tableName = `${sanitizedCompanyName}-Tender-Project`;

  // Extract userPK from query string parameters
  const projectPK = event.queryStringParameters?.projectPK;

  try {
    // Call GetProjectByVendor with the SK array and userPK
    const results = await getProjectDetailsByPK(projectPK);
    return {
      statusCode: 200,
      body: JSON.stringify(results), // Return the results as the response
    };
  } catch (error) {
    console.error("Error in handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Internal server error",
        error: error.message,
      }),
    };
  }
};





