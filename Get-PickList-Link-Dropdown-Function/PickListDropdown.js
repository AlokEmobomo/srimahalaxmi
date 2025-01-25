const {
  GetDetailsBasedOnUserPKandEntityType,
} = require("./PickListDropdownModel");
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

  console.log("Received event:", JSON.stringify(event, null, 2));
  console.log("userPK from token:", userPK);


  const { Module } = event.queryStringParameters;

  let resolvedTableName;
  if (Module === "Tender" || Module === "Project") {
    resolvedTableName = `${sanitizedCompanyName}-Tender-Project`;
  } else if (Module === "Customer" || Module === "Vendor") {
    resolvedTableName = `${sanitizedCompanyName}-Vendor`;
  } else if (Module === "Material") {
    resolvedTableName = `${sanitizedCompanyName}-Product`;
  } else if (Module === "Tools") {
    resolvedTableName = `${sanitizedCompanyName}-Tools`;
  } else if (Module === "PurchaseOrder") {
    resolvedTableName = `${sanitizedCompanyName}-Purchase-Reciept-Order`;
  } else {
    throw new Error("Invalid module provided");
  }

  try {
    // Call the model function to create a line item in the database
    const GetDetailsBasedOnUserPKandEntityTypeResult =
      await GetDetailsBasedOnUserPKandEntityType(
        resolvedTableName,
        Module,
        userPK
      );

    // Check if the result was successful
    if (!GetDetailsBasedOnUserPKandEntityTypeResult.success) {
      throw new Error(GetDetailsBasedOnUserPKandEntityTypeResult.message);
    }

    const queryResult = GetDetailsBasedOnUserPKandEntityTypeResult.data;

    const attributes = [];
    queryResult.forEach((item) => {
      Object.keys(item).forEach((key) => {
        if (
          !["PK", "SK", "RemoveFlag", "EntityType"].includes(key) &&
          !attributes.includes(key)
        ) {
          attributes.push(key);
        }
      });

      // Handling nested attributes inside Values
      if (item.Values && typeof item.Values === "object") {
        Object.keys(item.Values).forEach((nestedKey) => {
          if (!attributes.includes(nestedKey)) {
            attributes.push(nestedKey);
          }
        });
      }
    });

    console.log("Unique Attributes:", attributes);

    return {
      statusCode: 200,
      body: JSON.stringify({
        attributes,
      }),
    };
  } catch (error) {
    console.error("Error creating Product: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error creating Product",
        error: error.message,
      }),
    };
  }
};
