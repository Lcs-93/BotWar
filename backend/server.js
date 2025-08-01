const express = require("express");
const cors = require("cors");
const path = require("path");

const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let nextCommand = { move: "STAY", action: "NONE" };

app.get("/command", (req, res) => {
  const { move, action } = req.query || {};
  if (move) nextCommand.move = move;
  if (action) nextCommand.action = action;
  console.log(
    `✅ Command received: move=${nextCommand.move}, action=${nextCommand.action}`
  );
  res.json({ ok: true });
});

app.get("/action", (_req, res) => {
  console.log(`➡️ Sending command: move=${nextCommand.move}, action=${nextCommand.action}`);
  const command = nextCommand;
  nextCommand = { move: "STAY", action: "NONE" };
  res.json(command);
});

app.listen(port, () => {
  console.log(`🎮 Manual Bot-War server running on port ${port}`);
});

