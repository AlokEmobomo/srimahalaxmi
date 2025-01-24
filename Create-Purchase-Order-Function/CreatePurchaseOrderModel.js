const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "Purchase-Reciept-Order";

async function create(
  projectPK,
  PurchaseOrderId,
  userPK,
  tenderPK,
  VendorName,
  PurchaseOrderDetails,
  tableName
) {
  const params = {
    TableName: tableName,
    Item: {
      ...PurchaseOrderDetails,
      PK: PurchaseOrderId,
      SK: projectPK,
      userPK: userPK,
      tenderPK: tenderPK,
      Name: PurchaseOrderDetails.Values.PurchaseNo,
      VendorName: VendorName,
      RemoveFlag:1
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    return { success: true, message: "Purchase Order Added Successfully" };
  } catch (err) {
    console.log("Unable to add Project", err);
    return { success: false, message: err.message };
  }
}

async function findTenderByPONumberAndCodeNumber(poNumber, tenderCodeNumber) {
  console.log(poNumber, tenderCodeNumber);
  const params = {
    TableName: tableName,
    FilterExpression:
      "#val.#PONumber = :poNumber AND #val.#TenderCodeNumber = :tenderCodeNumber",
    ExpressionAttributeNames: {
      "#val": "Values", 
      "#PONumber": "PONumber", 
      "#TenderCodeNumber": "TenderCodenumber",
    },
    ExpressionAttributeValues: {
      ":poNumber": poNumber,
      ":tenderCodeNumber": tenderCodeNumber,
    },
  };

  const result = await docClient.send(new ScanCommand(params));
  return result.Items.length ? result.Items[0] : null;
}

module.exports = { create, findTenderByPONumberAndCodeNumber };
