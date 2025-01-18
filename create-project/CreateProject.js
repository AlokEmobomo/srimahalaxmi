const {
  create,
  findTenderByPONumberAndCodeNumber,
} = require("./CreateProjectModel"); // Adjust import path as needed
const decodeToken = require("./decodeToken");

const AWS = require("aws-sdk");
const lambda = new AWS.Lambda();

exports.handler = async (event) => {
  const authHeader = event.headers.Authorization || event.headers.authorization;

  if (!authHeader) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Authorization header is missing" }),
    };
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Token is missing" }),
    };
  }
  // Decode the token to get the userPK
  const decoded = decodeToken(token); // Provide your JWT secret key
  const userPK = decoded.UserId;
  const companyName = decoded.companyName;
  console.log(decoded.companyName);

  const sanitizedCompanyName = companyName
  .replace(/[\s&]/g, "")
  .replace(/[^a-zA-Z0-9]/g, "");

  const tableName = `${sanitizedCompanyName}-Tender-Project`;


  console.log("Received event:", JSON.stringify(event, null, 2));
  console.log("userPK from token:", userPK);

  const timestamp = Date.now(); // Current timestamp in milliseconds
  const body = JSON.parse(event.body); // Lambda event body is in string format

  const poNumber = body.PONumber;
  const tenderCodeNumber = body.TenderCodenumber;
  const tenderId = body.tenderId;
  const Name = body.PONumber;
  const projectId = `PRJ#${timestamp}`;
  const creationDate = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  const { ...values } = body;


  try {
    // Step 1: Check if a tender with matching PONumber and TenderCodeNumber exists
    const tender = await findTenderByPONumberAndCodeNumber(
      poNumber,
      tenderCodeNumber,
      tableName
    );

    if (!tender) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No matching tender found" }),
      };
    }

    // Step 2: Use the matched tender's PK as the SK for the new project
    const sk = tender.PK;
    values.PONumber = poNumber;

    // Step 3: Create the new project
    const projectDetails = {
      Name, 
      EntityType: "Project",
      CreationDate: creationDate,
      PONumber: poNumber,
      Values: values, // All other fields stored under Values
    };

    const result = await create(projectId, sk, userPK, projectDetails, tableName);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Project created successfully",
        ProjectId: projectId,
        result,

      }),
    };
  } catch (error) {
    console.error("Error creating project: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error creating project", error }),
    };
  }
};
