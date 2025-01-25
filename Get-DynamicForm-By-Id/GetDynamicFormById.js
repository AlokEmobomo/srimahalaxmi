const { getDynamicFormById } = require("./GetDynamicFormByIdModel");

exports.handler = async (event) => {
  console.log(event)
  const formId = event.queryStringParameters.formId;
  const valueId = event.queryStringParameters.valueId;


  console.log("Fetching form with ID:", formId,valueId);

  try {
    const result = await getDynamicFormById(formId,  valueId);

    console.log("API result:", result); // Log API response for debugging

    if (result.success) {
     
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: result,
        }),
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          message: "DynamicForm not found",
        }),
      };
    }
  } catch (error) {
    console.error("Error fetching vendor:", error); // Log error details

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "An error occurred while fetching the vendor.",
      }),
    };
  }
};
