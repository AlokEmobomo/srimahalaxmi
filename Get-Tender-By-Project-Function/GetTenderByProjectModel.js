const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

// Initialize DynamoDB client
const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

// Create DynamoDB Document Client
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const tableName = "Tender"; // Ensure this matches your actual table name

// Step 1: Get project details by ProjectPK (PRJ#)
async function getProjectDetailsByPK(ProjectPK) {
  const params = {
    TableName: tableName,
    KeyConditionExpression: "PK = :projectPK",
    ExpressionAttributeValues: {
      ":projectPK": ProjectPK, // Project PK (PRJ#...)
    },
  };

  try {
    // Query DynamoDB to get project details
    const data = await docClient.send(new QueryCommand(params));
    if (data.Items && data.Items.length > 0) {
      const project = data.Items[0];
      const tenderID = project.SK; // SK contains the Tender ID
      console.log(`Project Found:`, project);
      console.log(`TenderID: ${tenderID}`);

      // Step 2: Fetch tender details using the retrieved TenderID
      const tenderDetails = await getTenderDetailsByTenderID(tenderID, tableName);
      return tenderDetails;
    } else {
      return { success: false, message: "Project not found" };
    }
  } catch (error) {
    console.error("Error fetching project details:", error);
    return {
      success: false,
      message: "Error fetching project details",
      error: error.message,
    };
  }
}

// Step 2: Get tender details by TenderID (TEN#)
async function getTenderDetailsByTenderID(tenderID) {
  const params = {
    TableName: tableName,
    KeyConditionExpression: "PK = :tenderID",
    ExpressionAttributeValues: {
      ":tenderID": tenderID, // Tender PK (TEN#...)
    },
  };

  try {
    // Query DynamoDB to get tender details
    const data = await docClient.send(new QueryCommand(params));
    if (data.Items && data.Items.length > 0) {
       const tenderCodeNumber = data.Items[0].Values.TenderCodenumber;
       const customerName = data.Items[0].Values.CustomerName;
      console.log(`Tender Code Number:`, tenderCodeNumber);
      console.log(`Customer name:`, customerName);
      return { success: true, tenderCodeNumber, customerName };
    } else {
      return { success: false, message: "Tender not found" };
    }
  } catch (error) {
    console.error("Error fetching tender details:", error);
    return {
      success: false,
      message: "Error fetching tender details",
      error: error.message,
    };
  }
}

// Export the function
module.exports = {
  getProjectDetailsByPK,
};
