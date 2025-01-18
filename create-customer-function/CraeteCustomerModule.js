const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

// CREATE DYNAMODB  DOCUMENT CLIENTF

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);
 
// const tableName = "Vendor";

async function create(customerId, userPK, customerDetails, tableName) {
    const params = {
        TableName: tableName,
        Item: {
            ...customerDetails,
            PK: customerId,
            SK: customerId,
            userPK: userPK,
            RemoveFlag:1
        },
    };
    
    try{
        await docClient.send(new PutCommand(params));
        return {success : true, message: "Vendor Added Successfully"};
    } catch (err) {
        console.log("Unable to  add Vendor", err);
        return { success : false, message: err.message };
    }
}

module.exports ={create};