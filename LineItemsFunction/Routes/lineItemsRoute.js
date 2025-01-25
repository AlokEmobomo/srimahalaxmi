const express = require("express");
const ListItemsController = require("../Controllers/ListItemsController");

const LineItemRouter = express.Router();

LineItemRouter.post("/create-line-item", ListItemsController.createLineItem);
LineItemRouter.get(
  "/get-line-item-by-project",
  ListItemsController.fetchLineItemsByProject
);
LineItemRouter.put("/update-line-item", ListItemsController.updateLineItem);
// ProjectRouter.get("/get-projects-by-id/:id", ProjectsController.getProjectById);

module.exports = LineItemRouter;
