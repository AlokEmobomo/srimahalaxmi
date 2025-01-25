const { getOutSourceById } = require("./GetOutSourceByIdModel");

exports.handler = async (event) => {
  const OutSourcePK = event.pathParameters.id;

  console.log("Fetching tender with ID:", OutSourcePK);

  const result = await getOutSourceById(OutSourcePK);

  if (result.success) {
    const tender = result.data;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: tender,
      }),
    };
  } else {
    return {
      statusCode: 404,
      body: JSON.stringify({
        success: false,
        message: "WorkOrder not found",
      }),
    };
  }
};
