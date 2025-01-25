const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",

});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const tableName = "DynamicForm";

async function getDynamicFormById(formId, valueId) {
  const params = {
    TableName: tableName,
    KeyConditionExpression: "PK = :pk",
    ExpressionAttributeValues: {
      ":pk": formId,
    },
  };


  try {
    const data = await docClient.send(new QueryCommand(params));

    const formData = data.Items && data.Items.length > 0 ? data.Items[0] : null;

    if (!formData) {
      return { success: false, message: "No form data found" };
    }

    // Find the specific object in the Values array
    const specificValue = formData.Values.find((item) => item.id === valueId);

    if (!specificValue) {
      return { success: false, message: `No value found with id: ${valueId}` };
    }

    return { success: true, data: specificValue }
 
    // return { success: true, data: data.Items || [] };
  } catch (err) {
    console.error("Unable to query vendor", err);
    return { success: false, message: err.message };
  }
}

module.exports = { getDynamicFormById };
