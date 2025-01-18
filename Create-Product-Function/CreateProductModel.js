const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

// CREATE DYNAMODB  DOCUMENT CLIENT

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// const tableName = "Product";

async function create(MaterialPK, userPK, MaterialDetails,tableName) {
  console.log(MaterialPK, userPK, MaterialDetails);
  const params = {
    TableName: tableName,
    Item: {
      ...MaterialDetails,
      PK: MaterialPK,
      SK: MaterialPK,
      userPK: userPK,
      // RemoveFlag:1
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    return { success: true, message: "Product Added Successfully" };
  } catch (err) {
    console.log("Unable to add Product", err);
    return { success: false, message: err.message };
  }
}

async function TransactionCreate(
  InventoryTransactionId,
  OnHandPK,
  TransactionDetails,
  sanitizedCompanyName
) {
  const params = {
    TableName: `${sanitizedCompanyName}-InventoryTransaction`,
    Item: {
      ...TransactionDetails,
      PK: InventoryTransactionId,
      SK: OnHandPK,
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    return {
      success: true,
      message: "Onhand Inventory Transaction Added Successfully",
    };
  } catch (err) {
    console.log("Unable to add Onhand Inventory Transaction", err);
    return { success: false, message: err.message };
  }
}

async function OnHandCreate(MaterialPK, OnHandPK, OnHandDetails, sanitizedCompanyName) {
  console.log(MaterialPK, OnHandPK, OnHandDetails, OnHandDetails.Quantity);

  // Set up parameters for updating quantity and creation date
  const updateParams = {
    TableName:`${sanitizedCompanyName}-InventoryOnHand`,
    Key: {
      PK: OnHandPK,
      SK: MaterialPK,
    },
    UpdateExpression:
      "SET #quantity = :quantity, #creationDate = :creationDate ,#EntityType = :EntityType, #userPK = :userPK, #ProductName = :ProductName, #Comments = :Comments",
    ExpressionAttributeNames: {
      "#quantity": "Quantity",
      "#creationDate": "CreationDate",
      "#EntityType": "EntityType",
      "#userPK" : "userPK",
      "#ProductName" : "ProductName",
      "#Comments" : "Comments",
    },
    ExpressionAttributeValues: {
      ":quantity": OnHandDetails.Quantity,
      ":creationDate": OnHandDetails.CreationDate,
      ":EntityType": OnHandDetails.EntityType,
      ":userPK" : OnHandDetails.userPK,
      ":ProductName" : OnHandDetails.ProductName,
      ":Comments" : OnHandDetails.Comments
    },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    // Try to update the quantity and creation date if the SK exists
    const result = await docClient.send(new UpdateCommand(updateParams));
    return {
      success: true,
      message: "OnHand Updated Successfully",
      data: result.Attributes,
    };
  } catch (err) {
    // Handle ConditionalCheckFailedException and other errors
    if (err.name === "ConditionalCheckFailedException") {
      const putParams = {
        TableName: `${sanitizedCompanyName}-InventoryOnHand`,
        Item: {
          ...OnHandDetails,
          PK: OnHandPK,
          SK: MaterialPK,
        },
      };

      try {
        await docClient.send(new PutCommand(putParams));
        return { success: true, message: "OnHand Added Successfully" };
      } catch (putErr) {
        console.log("Unable to add OnHand", putErr);
        return { success: false, message: putErr.message };
      }
    } else {
      console.log("Unable to update OnHand", err);
      return { success: false, message: err.message };
    }
  }
}


module.exports = { create, TransactionCreate, OnHandCreate };
