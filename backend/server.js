const express = require("express");
const cors = require("cors");
const { decideMove } = require("./logic");

const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bot-War API is running. Try /action");
});

app.get("/action", (req, res) => {
  try {
    const game = JSON.parse(req.headers["x-game-state"]);
    const decision = decideMove(game);
    return res.json(decision);
  } catch (e) {
    console.error("Erreur:", e);
    return res.json({ move: "STAY", action: "NONE" });
  }
});

app.listen(port, () => {
  console.log(`🤖 Bot-War Server démarré sur le port ${port}`);
});

