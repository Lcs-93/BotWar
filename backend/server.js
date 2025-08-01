const express = require("express");
const cors = require("cors");
const path = require("path");

const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/action", (req, res) => {
  const { move = "STAY", action = "NONE", bombType } = req.query;

  const response = { move, action };
  if (action === "BOMB") {
    response.bombType = bombType || "proximity";
  }

  console.log("✅ Received command:", response);
  res.json(response);
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`🎮 Bot-War server running on port ${port}`);
  });
}

module.exports = app;