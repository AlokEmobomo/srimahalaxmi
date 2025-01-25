// const jwt = require("jsonwebtoken");
// const secretKey = "SEND_TOKEN"; // Your secret key for JWT verification

// exports.handler = async (event) => {
//   // Access the token from headers
//   const token = event.headers['authorization'] || event.headers['Authorization'];
//   console.log(event)

//   if (!token || !token.startsWith("Bearer ")) {
//     console.error("Unauthorized: No token provided");
//     throw new Error("Unauthorized");
//   }

//   const jwtToken = token.split(" ")[1];

//   try {
//     const decoded = jwt.verify(jwtToken, secretKey);
//     console.log("Decoded JWT:", decoded);
    
//     const region = event.requestContext.region || 'ap-south-1'; 
    
//      // Construct methodArn from the event object
//    // const methodArn = `arn:aws:execute-api:${event.requestContext.region}:${event.requestContext.accountId}:${event.requestContext.apiId}/${event.requestContext.stage}/${event.requestContext.http.method}${event.rawPath}`;
//     const methodArn = `arn:aws:execute-api:${region}:${event.requestContext.accountId}:${event.requestContext.apiId}/${event.requestContext.stage}/${event.requestContext.http.method}${event.rawPath}`;
    
//     console.log(decoded.UserId, "Allow", methodArn);
//     return generatePolicy(decoded.UserId, "Allow", methodArn);
//   } catch (err) {
//     console.error("Token verification error:", err.message); // Log the specific error message
//     throw new Error("Unauthorized");
//   }
// };

// const generatePolicy = (principalId, effect, resource) => {
//   const policyDocument = {
//     Version: "2012-10-17",
//     Statement: [
//       {
//         Action: "execute-api:Invoke",
//         Effect: effect,
//         Resource: resource,
//       },
//     ],
//   };
  
//   console.log("principalId",principalId);
//   console.log("policyDocument",policyDocument);
//   return {
//     principalId,
//     policyDocument,
//   };
// };

const jwt = require("jsonwebtoken");
const secretKey = "SEND_TOKEN"; // Your secret key for JWT verification

exports.handler = async (event) => {
  // Access the token from headers
  const token = event.headers['authorization'] || event.headers['Authorization'];
  console.log("Event:", event);

  if (!token || !token.startsWith("Bearer ")) {
    console.error("Unauthorized: No token provided");
    return generatePolicy("user", "Deny", event.methodArn); // Return a policy denying access
  }

  const jwtToken = token.split(" ")[1];

  try {
    // Verify JWT token
    const decoded = jwt.verify(jwtToken, secretKey);
    console.log("Decoded JWT:", decoded);
    
    // Extract required data from event to construct methodArn
    const region = event.requestContext.region || 'ap-south-1'; 
    const accountId = event.requestContext.accountId;
    const apiId = event.requestContext.apiId;
    const stage = event.requestContext.stage;
    const httpMethod = event.requestContext.http.method;
    const resourcePath = event.rawPath;
    const methodArn = event.routeArn;

    // Construct methodArn from the event object
    // const methodArn = `arn:aws:execute-api:${region}:${accountId}:${apiId}/${stage}/${httpMethod}${resourcePath}`;
    
    console.log("Allow access:", decoded.UserId, methodArn);
    return generatePolicy(decoded.UserId, "Allow", methodArn);
  } catch (err) {
    console.error("Token verification error:", err.message); // Log the specific error message
    return generatePolicy("user", "Deny", event.methodArn); // Return a policy denying access
  }
};

// Function to generate an IAM policy
const generatePolicy = (principalId, effect, resource) => {
  const policyDocument = {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "execute-api:Invoke",
        Effect: effect,
        Resource: resource,
      },
    ],
  };
  
  console.log("Generated Policy for principalId:", principalId);
  console.log("Policy Document:", policyDocument);
  return {
    principalId,
    policyDocument,
  };
};

// Optional: To handle CORS for responses (if needed)
const generateCorsResponse = () => {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*", // Or specify the allowed origin
      "Access-Control-Allow-Methods": "OPTIONS,GET,PUT,POST,DELETE",
    },
    body: JSON.stringify({ message: "CORS settings applied" }),
  };
};
