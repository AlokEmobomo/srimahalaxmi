const { getAllProjectsByTender } = require("./GetProjectsByTenderModel"); 
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


  // Extract query parameters from the event
  const { tenderId } = event.queryStringParameters || {};
  console.log("Query Parameters:", event.queryStringParameters);

  try {
    // Fetch projects associated with the tender
    const projectsResponse = await getAllProjectsByTender(tenderId, userPK, tableName);

    // Check if the response was successful
    if (!projectsResponse.success) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          message: projectsResponse.message,
        }),
      };
    }

    // If successful, respond with project details
    const projects = projectsResponse.data;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        projects: projects,
      }),
    };
  } catch (error) {
    console.error("Error fetching projects: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Error fetching projects",
        error: error.message,
      }),
    };
  }
};
