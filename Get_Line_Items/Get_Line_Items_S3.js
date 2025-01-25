const { getS3AttachmentsById } = require("./Get_Line_Items_Model");

exports.handler = async (event) => {
  const s3Id = event.pathParameters.id;

  console.log("Fetching S3Dynamodb with ID:", s3Id);

  const result = await getS3AttachmentsById(s3Id);

  if (result.success) {
    const s3data = result.data;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: s3data,
      }),
    };
  } else {
    return {
      statusCode: 404,
      body: JSON.stringify({
        success: false,
        message: "Project not found",
      }),
    };
  }
};
