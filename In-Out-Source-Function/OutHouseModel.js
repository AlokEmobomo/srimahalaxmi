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

// const tableName = "In-Out-Source";

async function create_WorkOrder(
  WorkOrderPK,
  GatePass,
  VendorName,
  ReturnStatus,
  CreationDate,
  Issued_Date,
  Received_Date, 
  Status,
  userPK,
  tableName
) {
  console.log(WorkOrderPK,
    GatePass,
    VendorName,
    ReturnStatus,
    CreationDate,
    Issued_Date,
    Received_Date, 
    Status,
    userPK);
  const params = {
    TableName: tableName,
    Item: {
      PK: WorkOrderPK,
      SK: WorkOrderPK,
      GatePass: GatePass,
      Name: GatePass,
      VendorName:VendorName,
      EntityType: "OutSource",
      ReturnStatus:ReturnStatus,
      CreationDate:CreationDate,
      Status:Status,
      Issued_Date:Issued_Date,
      Received_Date:Received_Date,
      userPK: userPK,
      RemoveFlag:1
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    return { success: true, message: "WorkOrder OutSource Added Successfully" };
  } catch (err) {
    console.log("Unable to add LineItem", err);
    return { success: false, message: err.message };
  }
}

async function create_WorkOrder_LineItem(
  WorkOrderLineItemPK,
  WorkOrderPK,
  WorkOrderId,
  ProjectNumber,
  LineItemName,
  Quantity,
  CreationDate,
  SNO,
  Description,
  userPK,
  ItemCode,
  tableName
) {

  const params = {
    TableName: tableName,
    Item: {
      PK: WorkOrderLineItemPK,
      SK: WorkOrderPK,
      WorkOrderId,
      ProjectNumber,
      LineItemName,
      Quantity,
      userPK: userPK,
      CreationDate,
      SNO,
      Description,
      ItemCode,
      EntityType: "OutSourceLineItem",
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    return {
      success: true,
      message: "WorkOrder OutSource LineItem Added Successfully",
    };
  } catch (err) {
    console.log("Unable to add LineItem", err);
    return { success: false, message: err.message };
  }
}

module.exports = { create_WorkOrder, create_WorkOrder_LineItem };
