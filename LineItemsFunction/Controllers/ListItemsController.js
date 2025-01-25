const lineItemsModel = require("../Models/lineItemsModel");

exports.createLineItem = async (req, res) => {
  const { SNO, projectPK, userPK, Name, ...values } = req.body;
  const lineItemId = `${projectPK}#L${SNO}`;

  const lineItemDetails = {
    projectPK,
    userPK,
    EntityType: "LineItem", // Set EntityType to "LineType"
    CreationDate: "12-8-24", // Set CreationDate to "12-8-24"
    Name,
    Values: values, // All remaining fields under 'Values'
  };

  try {
    const result = await lineItemsModel.create(
      projectPK,
      lineItemId,
      userPK,
      lineItemDetails
    );

    res.json({ message: "LineItem has created successfully", result });
  } catch (error) {
    console.error("Error creating project: ", error);
    res.status(500).json({ message: "Error creating project", error });
  }
};

exports.fetchLineItemsByProject = async (req, res) => {
  const { projectId, userPK } = req.query;
  console.log(req.query);

  try {
    // Fetch projects associated with the tender
    const LineItemsResponse = await lineItemsModel.getLineItemsByProject(
      projectId,
      userPK
    );

    if (!LineItemsResponse.success) {
      return res
        .status(500)
        .json({ success: false, message: LineItemsResponse.message });
    }

    // LineItemsResponse.data should already contain the project details
    const lineItems = LineItemsResponse.data;

    // Respond with the data
    res.json({ success: true, LineItems: lineItems });
  } catch (error) {
    console.error("Error fetching line items", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateLineItem = async (req, res) => {
  const { projectPK, lineItemId, Name, ...values } = req.body; // Separate 'Name' and keep other fields in 'values

  const updatedFields = {
    Name, // Keep 'Name' separate
    Values: values, // Store all other fields under 'Values'
  };

  try {
    // Call the update method in the model to update the line item
    const result = await lineItemsModel.updateListItem(
      projectPK,
      lineItemId,
      updatedFields
    );

    if (result.success) {
      // If the update was successful, return the updated data
      return res.status(200).json({
        message: "LineItem updated successfully",
        updatedData: result.data,
      });
    } else {
      // If there was an issue during the update, return an error message
      return res.status(500).json({ message: result.message });
    }
  } catch (error) {
    console.error("Error updating line item: ", error);
    res.status(500).json({ message: "Error updating line item", error });
  }
};
