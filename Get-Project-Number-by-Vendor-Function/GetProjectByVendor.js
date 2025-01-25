const { GetProjectByVendor } = require("./GetProjectByVendorModel.js");
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

  const tableName = `${sanitizedCompanyName}-Tender-Project`;

  console.log("Received event:", JSON.stringify(event, null, 2));
  console.log("userPK from token:", userPK);

  // Get the SK array from query parameters
  const skArrayString = event.queryStringParameters?.skArray; // e.g., '["PRJ#1726652714999","PRJ#1726312422240"]'

  // Convert the string to an array and clean it
  let skArray = [];
  if (skArrayString) {
    try {
      // Parse the JSON string to an array
      skArray = JSON.parse(skArrayString);
    } catch (e) {
      // Fallback to splitting by comma if JSON parsing fails
      skArray = skArrayString.split(",").map((s) => s.trim());
    }
  }

  // Check for required parameters
  if (!userPK || skArray.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        message: "Both userPK and skArray are required.",
      }),
    };
  }

  // Debug log to see the userPK and skArray
  console.log("userPK:", userPK);
  console.log("skArray:", skArray); // This should show a clean array of SK values

  try {
    // Call GetProjectByVendor with the SK array and userPK
    const results = await GetProjectByVendor(skArray, userPK, tableName);

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
