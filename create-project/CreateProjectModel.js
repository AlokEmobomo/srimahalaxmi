const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
  //   endpoint: "http://localhost:8000",
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "Tender";

async function create(projectId, tenderId, userPK, projectDetails, tableName) {
  console.log(projectId, tenderId, userPK, projectDetails);
  const params = {
    TableName: tableName,
    Item: {
      ...projectDetails,
      PK: projectId,
      SK: tenderId,
      userPK: userPK,
      RemoveFlag:1
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    return { success: true, message: "Project Added Successfully" };
  } catch (err) {
    console.log("Unable to add Project", err);
    return { success: false, message: err.message };
  }
}

async function findTenderByPONumberAndCodeNumber(poNumber, tenderCodeNumber,tableName) {
  console.log(poNumber, tenderCodeNumber);
  const params = {
    TableName: tableName,
    FilterExpression:
      "#val.#PONumber = :poNumber AND #val.#TenderCodeNumber = :tenderCodeNumber",
    ExpressionAttributeNames: {
      "#val": "Values", // Map 'Values' to avoid reserved keyword issue
      "#PONumber": "PONumber", // Mapping 'PONumber' as nested attribute
      "#TenderCodeNumber": "TenderCodenumber", // Mapping 'TenderCodenumber' as nested attribute
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
