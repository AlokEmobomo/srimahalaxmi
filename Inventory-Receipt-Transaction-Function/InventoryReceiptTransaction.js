const {
  InventoryTransaction,
  getProductsByName,
  updateProductQuantity,
  OnHandCreate,
} = require("./InventoryReceiptTransactionModel");

exports.handler = async (event) => {
  // Destructure event or parse if it's a string
  const {
    ReceiptLineItemId,
    ReceiptId,
    ProductName,
    userPK,
    ReceiptQuantity,
    WorkOrderId,
    sanitizedCompanyName
  } = typeof event === "string" ? JSON.parse(event) : event;

  console.log(event)

  const timestamp = Date.now(); // Current timestamp in milliseconds
  const InventoryTransactionId = `INVTRANS#${timestamp}`;
  const OnHandPK = `ONHAND#${timestamp}`;
  const creationDate = new Date().toISOString(); // Format date as ISO string

  try {
    // Retrieve product details using ProductName
    const productDetailsResult = await getProductsByName(ProductName, sanitizedCompanyName);

    if (!productDetailsResult.success) {
      throw new Error(
        `Error retrieving product details: ${productDetailsResult.message}`
      );
    }

    // Get ProductQuantity from productDetails
    const ProductQuantity = Number(productDetailsResult.projects[0].Quantity); // Convert to number
    const receiptQuantity = Number(ReceiptQuantity); // Convert ReceiptQuantity to a number
    const productId = productDetailsResult.projects[0].PK;
    const productPK = productDetailsResult.projects[0].PK;

    // Validate the quantities
    if (isNaN(ProductQuantity) || isNaN(receiptQuantity)) {
      throw new Error(
        "Invalid quantity values: ProductQuantity and ReceiptQuantity must be valid numbers."
      );
    }

    console.log(
      "ProductQuantity:",
      ProductQuantity,
      "ReceiptQuantity:",
      receiptQuantity
    );

    // Calculate OnhandQuantity (ProductQuantity + ReceiptQuantity)
    const OnhandQuantity = ProductQuantity + receiptQuantity;
    console.log("OnhandQuantity:", OnhandQuantity);

    const OnHandDetails = {
      userPK,
      ProductName,
      Quantity: OnhandQuantity,
      Comments: "From Receipt",
      EntityType: "OnHand",
      CreationDate: creationDate,
    };

    // Call the InventoryTransaction function to store the transaction in DynamoDB
    const result = await InventoryTransaction(
      InventoryTransactionId,
      ReceiptLineItemId,
      WorkOrderId,
      ProductName,
      ProductQuantity,
      receiptQuantity,
      creationDate,
      ReceiptId,
      OnhandQuantity,
      userPK,
      sanitizedCompanyName
    );

    // Update product quantity

    const productSK = productDetailsResult.projects[0].SK; // Include this if your table has one
    await updateProductQuantity(productPK, OnhandQuantity, sanitizedCompanyName); // Update the quantity in the product table

    const OnHandresult = await OnHandCreate(productId, OnHandPK, OnHandDetails, sanitizedCompanyName);

    return {
      statusCode: 200,
      body: JSON.stringify(result),
      OnHandresult,
    };
  } catch (error) {
    console.error("Error in handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: error.message }),
    };
  }
};
