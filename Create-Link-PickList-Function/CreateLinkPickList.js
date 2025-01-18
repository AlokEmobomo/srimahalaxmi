const {
  GetDetailsBasedOnUserPKandEntityType,
  createPickList,
  getAllData,
  updatePicklist,
} = require("./CreateLinkPickListModel");
const decodeToken = require("./decodeToken")

exports.handler = async (event) => {
  // Check if the event comes from API Gateway (HTTP request) or DynamoDB Streams
  if (event.Records && event.Records[0].eventID) {
    // Handle DynamoDB Stream Event
    return await handleDynamoDBStream(event);
  } else {
    // Handle HTTP Request (API Gateway)
    return await handleHttpRequest(event);
  }
};

// HTTP Request Handler (For API Gateway)
const handleHttpRequest = async (event) => {
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

  console.log("Received HTTP event:", JSON.stringify(event, null, 2));

  try {
    const { Name, Module, Attribute, Status } = JSON.parse(event.body);

    // Dynamically resolve the table name based on the module
    let resolvedTableName;
    if (Module === "Tender" || Module === "Project") {
      resolvedTableName = `${sanitizedCompanyName}-Tender-Project`; 
    } else if (Module === "Customer" || Module === "Vendor" ) {
      resolvedTableName = `${sanitizedCompanyName}-Vendor`; 
    }else if (Module === "Material") {
      resolvedTableName = `${sanitizedCompanyName}-Product`; 
    }else if (Module === "Tools") {
      resolvedTableName = `${sanitizedCompanyName}-Tools`; 
    }else if (Module === "PurchaseOrder") {
      resolvedTableName = `${sanitizedCompanyName}-Purchase-Reciept-Order`; 
    }else {
      throw new Error("Invalid module provided");
    }

    // Fetch details based on userPK and module name
    const GetDetailsBasedOnUserPKandEntityTypeResult =
      await GetDetailsBasedOnUserPKandEntityType(
        resolvedTableName,
        Module,
        userPK
      );

    // Check if the result was successful
    if (!GetDetailsBasedOnUserPKandEntityTypeResult.success) {
      throw new Error(GetDetailsBasedOnUserPKandEntityTypeResult.message);
    }

    const queryResult = GetDetailsBasedOnUserPKandEntityTypeResult.data;

    // Collect unique attributes excluding specific keys
    const attributes = [];
    queryResult.forEach((item) => {
      Object.keys(item).forEach((key) => {
        if (
          !["PK", "SK", "RemoveFlag", "EntityType"].includes(key) &&
          !attributes.includes(key)
        ) {
          attributes.push(key);
        }
      });

      // Handling nested attributes inside Values
      if (item.Values && typeof item.Values === "object") {
        Object.keys(item.Values).forEach((nestedKey) => {
          if (!attributes.includes(nestedKey)) {
            attributes.push(nestedKey);
          }
        });
      }
    });

    console.log("Unique Attributes:", attributes);

    // Extract values for the specified attribute (from the incoming request body)
    const options = [];
    queryResult.forEach((item) => {
      console.log(item, item[Attribute]);
    
      // Check if the attribute exists in Values or at the top level
      if (item.Values && item.Values[Attribute]) {
        options.push(item.Values[Attribute]); // Add attribute from Values
      } else if (item[Attribute]) {
        options.push(item[Attribute]); // Add attribute from the top level
      } else {
        console.warn("Attribute not found in both Values and top level:", item);
      }
    });
    
    
    console.log("Options:", options);

    // Create the picklist with the fetched options
    const result = await createPickList(Name, options, Attribute, Status, userPK);

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Options stored successfully!",
        attributes,
        options,
        result,
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error processing request",
        error: error.message,
      }),
    };
  }
};


// DynamoDB Stream Handler
const handleDynamoDBStream = async (event) => {
  console.log("Received Stream event:", JSON.stringify(event, null, 2));

  // Iterate over the records from DynamoDB stream
  for (const record of event.Records) {
    console.log("Stream record:", JSON.stringify(record, null, 2));

    // Process only INSERT or MODIFY events
    if (record.eventName === "INSERT" || record.eventName === "MODIFY") {
      const newData = record.dynamodb.NewImage;

      // Check if the required attribute is present
      if (newData && newData.EntityType) {
        const moduleName = newData.EntityType.S; // Module name from the stream record
        let resolvedTableName;

        // Dynamically resolve the table name based on the module
        switch (moduleName) {
          
          case "Tender":
            resolvedTableName = "srimahalaxmidemo-Tender-Project"; 
            break;
          case "Project":
            resolvedTableName = "srimahalaxmidemo-Tender-Project"; 
            break;
          case "Customer":
            resolvedTableName = "srimahalaxmidemo-Vendor"; 
            break;
          case "Vendor":
            resolvedTableName = "srimahalaxmidemo-Vendor"; 
            break;
          case "Material":
            resolvedTableName = "srimahalaxmidemo-Product";
            break;
          case "Tools":
            resolvedTableName = "srimahalaxmidemo-Tools"; 
            break;
          case "PurchaseOrder":
              resolvedTableName = "srimahalaxmidemo-Purchase-Reciept-Order";
              break;
          default:
            throw new Error("Invalid module name in stream record");
        }

        try {
          const userPK = newData.userPK.S;

          // Fetch details based on userPK and module name
          const GetDetailsBasedOnUserPKandEntityTypeResult =
            await GetDetailsBasedOnUserPKandEntityType(
              resolvedTableName,
              moduleName,
              userPK
            );

          // Check if the result was successful
          if (!GetDetailsBasedOnUserPKandEntityTypeResult.success) {
            throw new Error(GetDetailsBasedOnUserPKandEntityTypeResult.message);
          }

          const queryResult = GetDetailsBasedOnUserPKandEntityTypeResult.data;

          // Collect unique attributes excluding specific keys
          const attributes = [];
          queryResult.forEach((item) => {
            Object.keys(item).forEach((key) => {
              if (
                !["PK", "SK", "RemoveFlag", "EntityType"].includes(key) &&
                !attributes.includes(key)
              ) {
                attributes.push(key);
              }
            });

            // Handling nested attributes inside Values
            if (item.Values && typeof item.Values === "object") {
              Object.keys(item.Values).forEach((nestedKey) => {
                if (!attributes.includes(nestedKey)) {
                  attributes.push(nestedKey);
                }
              });
            }
          });

          console.log("Unique Attributes:", attributes);

          // Fetch all picklist data using getAllData
          const picklistData = await getAllData();

          // Iterate through the picklist data
          for (let picklist of picklistData) {
            // Check if the picklist Attribute is in the attributes array
            if (attributes.includes(picklist.Attribute)) {
              console.log(
                "Found matching Attribute in picklist:",
                picklist.Attribute
              );

              // If a match is found, add the new values to the Options array
              const newValues = queryResult.reduce((acc, item) => {
                // Check if the attribute exists in the Values object
                if (item.Values && item.Values[picklist.Attribute]) {
                  acc.push(item.Values[picklist.Attribute]);
                }
                return acc;
              }, []);

              // Add new options from the stream data, ensuring no duplicates
              newValues.forEach((newOption) => {
                if (!picklist.Options.includes(newOption)) {
                  picklist.Options.push(newOption);
                }
              });

              console.log("Updated picklist options:", picklist.Options);

              // Update the picklist data in the table
              const updateResult = await updatePicklist(picklist);
              console.log("Picklist updated successfully:", updateResult);
            }
          }

          // Log the final result
          console.log("Picklist process completed.");
        } catch (error) {
          console.error("Error:", error);
        }
      } else {
        console.error("Invalid stream record, missing module:", record);
      }
    }
  }
};
