const { getS3 } = require("./Get-All-S3-Model");
const decodeToken = require("./decodeToken");
// Lambda handler
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

  console.log("Received event:", JSON.stringify(event, null, 2));
  console.log("userPK from token:", userPK);

  try {
    // Call the function to get all tenders using the 'userPK'
    const result = await getS3(userPK);

    // Return the result
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    // Handle any errors
    console.error("Error fetching S3:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
