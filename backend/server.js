const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bot-War API is running. Try /action");
});

// GET /action → pour les tests de connexion (le gameState est dans le header X-Game-State)
app.get("/action", (req, res) => {
  const gameStateHeader = req.headers["x-game-state"];

  if (!gameStateHeader) {
    return res.status(400).json({ error: "Missing X-Game-State header." });
  }

  let gameState;
  try {
    gameState = JSON.parse(gameStateHeader);
  } catch (error) {
    return res.status(400).json({ error: "Invalid JSON in X-Game-State header." });
  }

  const { bot, grid } = gameState;
  const x = bot.position.x;
  const y = bot.position.y;

  let move = "STAY";

  if (x > 0 && grid[y][x - 1] === "diamond") move = "LEFT";
  else if (x < 4 && grid[y][x + 1] === "diamond") move = "RIGHT";
  else if (y > 0 && grid[y - 1][x] === "diamond") move = "UP";
  else if (y < 4 && grid[y + 1][x] === "diamond") move = "DOWN";

  res.json({ move });
});

// POST /action → pour la simulation avec JSON dans le body
app.post("/action", (req, res) => {
  const gameState = req.body;

  if (!gameState || !gameState.grid || !gameState.bot) {
    return res.status(400).json({ error: "Invalid game state received." });
  }

  const { bot, grid } = gameState;
  const x = bot.position.x;
  const y = bot.position.y;

  let move = "STAY";

  if (x > 0 && grid[y][x - 1] === "diamond") move = "LEFT";
  else if (x < 4 && grid[y][x + 1] === "diamond") move = "RIGHT";
  else if (y > 0 && grid[y - 1][x] === "diamond") move = "UP";
  else if (y < 4 && grid[y + 1][x] === "diamond") move = "DOWN";

  res.json({ move });
});

app.listen(port , () => console.log("Le serveur tourne sur le port " + port));