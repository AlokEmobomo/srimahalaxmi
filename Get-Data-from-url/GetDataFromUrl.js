const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(dynamoDBClient);

exports.handler = async (event) => {
  console.log("Event:", event);

  try {
    const Url = event.pathParameters.id;
    const tableName = "Users";

    if (!Url) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Missing required fields: Url.",
        }),
      };
    }

    const params = {
      TableName: tableName,
      FilterExpression: "#cn = :Url",
      ExpressionAttributeNames: {
        "#cn": "Url",
      },
      ExpressionAttributeValues: {
        ":Url": decodeURIComponent(Url), // Decode URL-encoded string
      },
    };

    const result = await ddbDocClient.send(new ScanCommand(params));

    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "No matching items found.",
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Scan successful",
        items: result.Items,
      }),
    };
  } catch (error) {
    console.error("Error scanning table:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to fetch data",
        error: error.message,
      }),
    };
  }
};
