const express = require("express");
const bodyParser = require("body-parser");
const lineItemsRouter = require("./Routes/lineItemsRoute");

const app = express();
// Middleware to parse JSON bodies
app.use(express.json());
app.use(bodyParser.json());

const cors = require("cors");
app.use(cors());

app.use("/api/line-item", lineItemsRouter);
// Start the server
const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = { app };

