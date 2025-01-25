const { create } = require("./CreateTenderLineItemModel");
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
  // Parse the request body
  const body = JSON.parse(event.body);
  const { SNO, tenderPK, Description, ...values } = body;
  const lineItemId = `${tenderPK}#L${SNO}`;
  const creationDate =new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });

  // Construct the line item details
  const lineItemDetails = {
    tenderPK,
    userPK,
    EntityType: "TenderLineItem", // Set EntityType to "LineItem"
    CreationDate: creationDate, // Set CreationDate to "12-8-24"
    Name : Description, 
    Values: {...values, SNO}, // All remaining fields under 'Values'
  };

  try {
    // Call the model function to create a line item in the database
    const result = await create(tenderPK, lineItemId, userPK, lineItemDetails, tableName);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "LineItem has been created successfully",
        result,
      }),
    };
  } catch (error) {
    console.error("Error creating line item: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error creating line item",
        error: error.message,
      }),
    };
  }
};
