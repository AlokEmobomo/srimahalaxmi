const {
  getUserByEmail,
  getUserPassword,
  fetchRolesAndPermissions,
  extractUserIdFromPK,
} = require("./LoginModel");
const jwt = require("jsonwebtoken");

exports.handler = async (event) => {
  const JWT_SECRET = "SEND_TOKEN";
  const { companyEmail, password } = JSON.parse(event.body);
  console.log(companyEmail, password)

  if (!companyEmail || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Email and password are required." }),
    };
  }

  try {
    // Fetch user and company data by email
    const response = await getUserByEmail(companyEmail);
    console.log(response)

    if (!response) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Invalid email or password" }),
      };
    }

    const userPK = extractUserIdFromPK(response.company.PK);

    console.log(userPK, "userPK")

    const company = response.company;

    console.log(company, "company")

    if (!userPK) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Error extracting userId" }),
      };
    }

    const storedPassword = await getUserPassword(userPK, response.company.SK);

    console.log(storedPassword, "storedPassword")

    if (password !== storedPassword) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Invalid password" }),
      };
    }

    // Fetch roles and permissions
    const rolesAndPermissions = await fetchRolesAndPermissions(userPK);

    if (!rolesAndPermissions) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "No roles or permissions found" }),
      };
    }

      // Remove password from each object in rolesAndPermissions.data if it exists
      if (Array.isArray(rolesAndPermissions.data)) {
        rolesAndPermissions.data.forEach((item) => {
          if (item.Password) {
            delete item.Password;
          }
        });
      }

    // Generate JWT token
    const token = jwt.sign(
      {
        UserId: `USER#${userPK}`,
        data: rolesAndPermissions.data,
        companyName: company.CompanyName,
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Login successful",
        UserId: `USER#${userPK}`,
        token,
        data: rolesAndPermissions.data,
        company,
      }),
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
