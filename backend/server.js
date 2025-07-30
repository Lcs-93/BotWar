const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bot-War API is running. Try /action");
});

app.get("/action", (req, res) => {
  res.send("Cette route doit être appelée en POST");
});

app.post("/action", (req, res) => {
  const gameState = req.body;

  const bot = gameState.bot; // ton bot
  const grid = gameState.grid; // grille 5x5
  const x = bot.position.x;
  const y = bot.position.y;

  // Chercher un diamant à proximité (diamonds = 1pt)
  let move = "STAY";
  let action = "NONE";

  if (x > 0 && grid[y][x - 1] === "diamond") move = "LEFT";
  else if (x < 4 && grid[y][x + 1] === "diamond") move = "RIGHT";
  else if (y > 0 && grid[y - 1][x] === "diamond") move = "UP";
  else if (y < 4 && grid[y + 1][x] === "diamond") move = "DOWN";

  res.json({ move, action });
});

app.listen(port , () => console.log("Le serveur tourne sur le port " + port));