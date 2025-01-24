const { create, checkAndCreateProduct } = require("./CreatePurchaseOrderLineItemModel");
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
  const decoded = decodeToken(token); // Ensure decodeToken uses the correct secret key
  const userPK = decoded.UserId;
  const companyName = decoded.companyName;
  console.log(decoded.companyName);

  const sanitizedCompanyName = companyName
  .replace(/[\s&]/g, "")
  .replace(/[^a-zA-Z0-9]/g, "");

  const tableName = `${sanitizedCompanyName}-Purchase-Reciept-Order`;

  console.log("Received event:", JSON.stringify(event, null, 2));
  console.log("userPK from token:", userPK);

  // Parse the request body
  const body = JSON.parse(event.body);
  const {
    SNO,
    PoLineNo,
    PurchaseOrderId,
    MaterialName,
    Grade,
    Dimension,
    MaterialId,
    WorkOrderId,
    Quantity, 
    ...values
  } = body;

  const PurchaseOrderIdLineItemId = `${PurchaseOrderId}#L${PoLineNo}`;
  const creationDate = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  values.PoLineNo = PoLineNo;
  values.MaterialName = MaterialName;
  values.Grade = Grade;
  values.Dimension = Dimension;
  values.Quantity = Quantity;

  // Construct the line item details
  const PurchaseOrderLineItemDetails = {
    PoLineNo,
    MaterialId,
    WorkOrderId,
    userPK,
    EntityType: "POLineItem",
    CreationDate: creationDate,
    Name:WorkOrderId,
    Values: values,
  };

  try {
    
    const productExists = await checkAndCreateProduct(
      MaterialId,
      userPK,
      {
        MaterialName,
        Grade,
        Dimension,
        Quantity,
        WorkOrderId
      },
      token,
      sanitizedCompanyName
    );

    // Call the model function to create a line item in the database
    const result = await create(
      PurchaseOrderId,
      PurchaseOrderIdLineItemId,
      userPK,
      PurchaseOrderLineItemDetails,
      tableName
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Purchase Order Line Item has been created successfully",
        result,
      }),
    };
  } catch (error) {
    console.error("Error creating Purchase Order line item: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error creating Purchase Order line item",
        error: error.message,
      }),
    };
  }
};
