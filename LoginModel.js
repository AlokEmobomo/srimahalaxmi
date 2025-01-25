const {
  DynamoDBClient,
} = require("@aws-sdk/client-dynamodb");
const {
  GetCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({
  region: "ap-south-1",
});

const tableName = "Users";



// Fetch user data by email
const getUserByEmail = async (companyEmail) => {
  const params = {
    TableName: tableName,
    IndexName: "EmailIndex",
    KeyConditionExpression: "CompanyEmail = :companyEmail",
    ExpressionAttributeValues: {
      ":companyEmail": companyEmail,
    },
  };

  const data = await dynamoDBClient.send(new QueryCommand(params));

  if (!data.Items.length) {
    return null;
  }

  const company = data.Items[0];
  const companyPK = company.PK;

  const params2 = {
    TableName: tableName,
    FilterExpression: "SK = :companyPK",
    ExpressionAttributeValues: {
      ":companyPK": companyPK,
    },
  };

  const scanData = await dynamoDBClient.send(new ScanCommand(params2));

  let UserId = null;
  for (const item of scanData.Items) {
    if (item.PK && item.PK.startsWith("USER#")) {
      UserId = item.PK;
      break;
    }
  }

  return { company, UserId };
};

// Fetch user password
const getUserPassword = async (userPK, companySK) => {
  if (!userPK || !companySK) {
    throw new Error("Invalid input: userPK and companySK are required");
  }

  console.log(userPK)
  console.log("Fetching password for user:", `USER#${userPK}`, companySK);

  const params = {
    TableName: tableName,
    Key: {
      PK: `USER#${userPK}`,
      SK: companySK,
    },
  };

  try {
    const data = await dynamoDBClient.send(new GetCommand(params));
    console.log(data)
    return data.Item ? data.Item.Password : null;
  } catch (error) {
    console.error("Error fetching user password:", error);
    throw new Error("Could not fetch user password");
  }
};


// Fetch roles and permissions
const fetchRolesAndPermissions = async (userPK) => {
  const params = {
    TableName: tableName,
    KeyConditionExpression: "PK = :userPK AND begins_with(SK, :rolePrefix)",
    ExpressionAttributeValues: {
      ":userPK": `USER#${userPK}`,
      ":rolePrefix": "COM#",
    },
  };

  const data = await dynamoDBClient.send(new QueryCommand(params));

  if (!data.Items || !data.Items.length) {
    return null;
  }

  const roles = [];
  const permissions = new Set();

  data.Items.forEach((item) => {
    if (item.Role) roles.push(item.Role);
    if (item.Permissions && Array.isArray(item.Permissions)) {
      item.Permissions.forEach((perm) => permissions.add(perm));
    }
  });
    

  return {
    roles,
    permissions: Array.from(permissions),
    data:data.Items,
  };
};

// Extract user ID from PK
const extractUserIdFromPK = (pk) => {
  const parts = pk.split("#");
  return parts.length === 2 ? parts[1] : null;
};

module.exports = {
  getUserByEmail,
  getUserPassword,
  fetchRolesAndPermissions,
  extractUserIdFromPK,
};