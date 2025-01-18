const {
    createField,
    checkModuleExists,
    updateExistingField,
  } = require("./CreateAddFieldModel");
  const decodeToken = require("./decodeToken");
  
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
  
    let userPK;
    try {
      const decoded = decodeToken(token); // Provide your JWT secret key
      userPK = decoded.UserId;
    } catch (error) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid token" }),
      };
    }
  
    console.log("Received event:", JSON.stringify(event, null, 2));
    console.log("userPK from token:", userPK);
  
    // Parse the request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid request body" }),
      };
    }
  
    const { ModuleName, Values } = body;
  
    if (!ModuleName || !Values) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "'ModuleName' and 'Values' are required" }),
      };
    }
  
    const timestamp = Date.now();
    const DynamicFormId = `DF#${timestamp}`;
    const creationDate = new Date().toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  
    try {
      const check = await checkModuleExists(userPK, ModuleName);
      let action;
      if (!check.success) {
        await createField(
          ModuleName,
          userPK,
          Values,
          DynamicFormId,
          creationDate
        );
        action = "created";
      } else {
        const updateDetails = [ Values ]; // Define updateDetails as needed
        const updateDynamicFormId = check.data[0].PK
        console.log( check.data[0].PK)
        await updateExistingField(
          ModuleName,
          userPK,
          updateDetails,
          updateDynamicFormId,
        );
        action = "updated";
      }
  
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `Module has been successfully ${action}`,
        }),
      };
    } catch (error) {
      console.error("Error processing request: ", error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Error processing request",
          error: error.message,
        }),
      };
    }
  };