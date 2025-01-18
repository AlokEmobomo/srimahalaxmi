const {
  DynamoDBClient,
  CreateTableCommand,
} = require("@aws-sdk/client-dynamodb");

// Initialize DynamoDB client
const dynamoDBClient = new DynamoDBClient({ region: "ap-south-1" });

exports.handler = async (event) => {
  try {
    // Extract input from the Lambda event object
    const { companyName, modules } = JSON.parse(event.body);
    console.log(event.body)
    console.log( { companyName, modules })

    if (!companyName || !modules || !Array.isArray(modules)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message:
            "Invalid input: 'companyName' and 'modules' array are required.",
        }),
      };
    }

    // Replace spaces and special characters in company name for table naming
    const sanitizedCompanyName = companyName
      .replace(/[\s&]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "");

    for (const module of modules) {
      const tableName = `${sanitizedCompanyName}-${module.replace(/\s+/g, "")}`; // Remove spaces from module name

      const params = {
        TableName: tableName,
        KeySchema: [
          { AttributeName: "PK", KeyType: "HASH" }, // Partition Key
          { AttributeName: "SK", KeyType: "RANGE" }, // Sort Key
        ],
        AttributeDefinitions: [
          { AttributeName: "PK", AttributeType: "S" }, // String
          { AttributeName: "SK", AttributeType: "S" }, // String
        ],
        BillingMode: "PAY_PER_REQUEST", // On-demand capacity
      };

      try {
        console.log(`Creating table: ${tableName}`);
        const command = new CreateTableCommand(params);
        await dynamoDBClient.send(command);
        console.log(`Table ${tableName} created successfully.`);
      } catch (error) {
        console.error(`Failed to create table ${tableName}:`, error.message);
        return {
          statusCode: 500,
          body: JSON.stringify({
            message: `Failed to create table ${tableName}: ${error.message}`,
          }),
        };
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "All tables created successfully.",
      }),
    };
  } catch (error) {
    console.error("Unexpected error:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal server error.",
        error: error.message,
      }),
    };
  }
};
