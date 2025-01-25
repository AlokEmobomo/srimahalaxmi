const { GetLineItemsByVenderWhenBuy } = require("./GetLineItemsByVenderWhenBuyModel"); // Adjust the path as needed
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

  const { ProjectPK, VendorName } = event.queryStringParameters;

  try {
    // Call the model function to retrieve the line items
    const filteredLineItems = await GetLineItemsByVenderWhenBuy(ProjectPK, VendorName, tableName);

    // Map over the line items to get the Name and Product for each one
    const lineItems = filteredLineItems.map(item => ({
      LineItemName: item.Name,
      WorkOrderId: item.Values.WorkOrderId,
      ProductName: item.Values.Product,
      LineItemPK:item.PK,
      ProjectPK:item.SK,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        result: {
          statusCode: 200,
          LineItems: lineItems, // Return the mapped line items
          //body: filteredLineItems, // Directly return the filtered line items
        },
      }),
    };
  } catch (error) {
    console.error("Error Getting the Line Items: ", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Error Getting the Line Items",
        error: error.message,
      }),
    };
  }
};
