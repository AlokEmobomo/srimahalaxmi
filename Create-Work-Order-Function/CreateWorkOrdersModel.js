const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

// CREATE DYNAMODB  DOCUMENT CLIENT

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "WorkOrder";

async function create(
  WorkOrderPK,
  ProductPK,
  ProductName,
  WorkOrderQuantity,
  OnHandQuantity,
  userPK,
  WorkOrderDetails,
  tableName
) {
  console.log(
    WorkOrderPK,
    ProductPK,
    ProductName,
    WorkOrderQuantity,
    OnHandQuantity,
    userPK,
    WorkOrderDetails
  );
  const params = {
    TableName: tableName,
    Item: {
      ...WorkOrderDetails,
      PK: WorkOrderPK,
      SK: ProductPK,
      userPK: userPK,
      Name: ProductName,
      WorkOrderQuantity: WorkOrderQuantity,
      OnHandQuantity: OnHandQuantity,
      RemoveFlag:1
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    return { success: true, message: "WorkOrder Added Successfully" };
  } catch (err) {
    console.log("Unable to add LineItem", err);
    return { success: false, message: err.message };
  }
}

async function getProductsByName(productName, sanitizedCompanyName) {
  console.log(productName);
  const params = {
    TableName: `${sanitizedCompanyName}-Product`,
    FilterExpression: "#name = :productName",
    ExpressionAttributeNames: {
      "#name": "Name", // Use a placeholder for the reserved keyword
    },
    ExpressionAttributeValues: {
      ":productName": productName,
    },
  };

  try {
    const data = await docClient.send(new ScanCommand(params));
    return { success: true, products: data.Items };
  } catch (err) {
    console.error("Unable to query products:", err);
    return { success: false, message: err.message };
  }
}

module.exports = { create, getProductsByName };
