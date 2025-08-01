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
  const { move, action, bombType } = req.query || {};
  if (move) nextCommand.move = move;
  if (action) nextCommand.action = action;
  if (action === "BOMB") {
    nextCommand.bombType = bombType || "proximity";
  } else {
    delete nextCommand.bombType;
  }
  console.log(
    `✅ Command received: move=${nextCommand.move}, action=${nextCommand.action}` +
      (nextCommand.bombType ? `, bombType=${nextCommand.bombType}` : "")
  );
  res.json({ ok: true });
});


app.get("/action", (_req, res) => {
  console.log(
    `➡️ Sending command: move=${nextCommand.move}, action=${nextCommand.action}` +
      (nextCommand.bombType ? `, bombType=${nextCommand.bombType}` : "")
  );
  const command = nextCommand;
  nextCommand = { move: "STAY", action: "NONE" };
  res.json(command);
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`🎮 Manual Bot-War server running on port ${port}`);
  });
}

module.exports = app;

