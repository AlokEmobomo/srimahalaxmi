const { create } = require("./CreateVendorModel");
const decodeToken = require("./decodeToken");

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = String(date.getFullYear()).slice(-2);

    return `${month}-${day}-${year}`;
}

// Get the current date
const currentDate = new Date();

// Format the current date
const formattedDate = formatDate(currentDate);

exports.handler = async (event) => {
    const authHeader =
        event.headers.Authorization || event.headers.authorization;

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

    const tableName = `${sanitizedCompanyName}-Vendor`;

    console.log("Received event:", JSON.stringify(event, null, 2));
    console.log("userPK from token:", userPK);

    // Parse the request body
    const body = JSON.parse(event.body);
    const { CompanyName, ...values } = body;
    const timestamp = Date.now(); // Current timestamp in milliseconds
    const vendorId = `VEN#${timestamp}`;

    // Construct the line item details
    const vendorDetails = {
        EntityType: "Vendor",
        CreationDate: formattedDate,
        Name: CompanyName,
        CompanyName,
        Values: values, // All remaining fields under 'Values'
    };

    try {
        // Call the model function to create a line item in the database
        const result = await create(vendorId, userPK, vendorDetails, tableName);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Vendor has been created successfully",
                result,
            }),
        };
    } catch (error) {
        console.error("Error creating Product: ", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Error creating Product",
                error: error.message,
            }),
        };
    }
};
