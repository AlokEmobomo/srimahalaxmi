const { create } = require("./CreateTenderModel");
const decodeToken = require("./decodeToken");

function formatDateToDDMMYYYY(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function reformatDates(data) {
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      // If the value is a date string, convert it
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        data[key] = formatDateToDDMMYYYY(value);
      } else if (typeof value === "object" && value !== null) {
        // Recursively handle nested objects
        reformatDates(value);
      }
    }
  }
}

async function createTender(event) {
  const authHeader = event.headers.Authorization || event.headers.authorization;

  const authorizerContext = event.requestContext.authorizer;

  if (authorizerContext && authorizerContext.message) {
    console.error("Error from authorizer:", authorizerContext.message);

    // Return a response with the custom error message
    return {
      statusCode: 403, // Forbidden
      body: JSON.stringify({
        message: authorizerContext.message,
      }),
    };
  }


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
  const decoded = decodeToken(token);
  const userPK = decoded.UserId;

  console.log("Received event:", JSON.stringify(event, null, 2));
  console.log("userPK from token:", userPK);

  const tenderDetails = JSON.parse(event.body); // Parse the event body
  const timestamp = Date.now();
  const tenderId = `TEN#${timestamp}`;
  const creationDate = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
  const files = tenderDetails.files;
  const Name = tenderDetails.Name;

  // Reformat all date fields in tenderDetails
  reformatDates(tenderDetails);

  delete tenderDetails.files;

  const result = await create(tenderId, userPK, tenderDetails, creationDate);

  const combinedResponse = {
    mainCreateResult: result,
  };

  return {
    statusCode: 200,
    body: JSON.stringify(combinedResponse),
  };
}

// Lambda handler
exports.handler = async (event) => {
  try {
    return await createTender(event);
  } catch (error) {
    console.error("Error creating tender:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
