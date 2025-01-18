const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});


const docClient = DynamoDBDocumentClient.from(dynamoDBClient);
 
const tableName = "Picklist";

async function create(PicklistName,Status, userPK, Options, PicklistId, creationDate) {
    const params = {
        TableName: tableName,
        Item: {
            PK: PicklistId,
            SK: PicklistId,
            userPK: userPK,
            EntityType: "PickList",
            creationDate: creationDate,
            Options: Options,
            Name:PicklistName,
            Status: Status,
        },
    };
    
    try{
        await docClient.send(new PutCommand(params));
        return {success : true, message: "PickList Added Successfully"};
    } catch (err) {
        console.log("Unable to  add PickList", err);
        return { success : false, message: err.message };
    }
}

module.exports ={create};