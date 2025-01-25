const {
  InventoryTransaction,
  updateProductQuantity,
} = require("./InventoryWorkOrderTransactionModel");

const AWS = require("aws-sdk");
const lambda = new AWS.Lambda();

exports.handler = async (event) => {
  const {
    WorkOrderPK,
    ProductName,
    userPK,
    ProductQuantity,
    WorkOrderQty,
    OnhandQuantity,
    ProductPK,
    WorkOrderId,
    sanitizedCompanyName
  } = event;

  const timestamp = Date.now(); // Current timestamp in milliseconds
  const InventoryTransactionId = `INVTRANS#${timestamp}`;
  const creationDate = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }); // Format date as ISO string

  try {
    // Call the InventoryTransaction function to store the transaction in DynamoDB
    const result = await InventoryTransaction(
      InventoryTransactionId,
      WorkOrderPK,
      ProductName,
      ProductQuantity,
      WorkOrderQty,
      creationDate,
      OnhandQuantity,
      userPK,
      WorkOrderId,
      sanitizedCompanyName
    );

    await updateProductQuantity(ProductPK, OnhandQuantity, sanitizedCompanyName); // Update the quantity in the product table.
    const lambdaParams = {
      FunctionName:
        "arn:aws:lambda:ap-south-1:345594590006:function:Create-On-Hand-WO:Dev", // Replace with the actual Lambda function name
      InvocationType: "RequestResponse", // Use "Event" for asynchronous invocation if desired
      Payload: JSON.stringify({
        body: JSON.stringify({
          productId: ProductPK,
          ProductName,
          Comments: "Work Order",
          Quantity: OnhandQuantity,
          userPK,
          sanitizedCompanyName
        }),
      }),
    };

    const lambdaResponse = await lambda.invoke(lambdaParams).promise();

    // Check the status code from the response
    if (lambdaResponse.StatusCode !== 200) {
      throw new Error(
        `Lambda invocation failed with status code: ${lambdaResponse.StatusCode}`
      );
    }
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Error in handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: error.message }),
    };
  }
};
