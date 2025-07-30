const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bot-War API is running. Try /action");
});

// Endpoint GET /action — utilisé par le simulateur
app.get("/action", (req, res) => {
  const header = req.headers["x-game-state"];

  if (!header) {
    console.log("❌ Header X-Game-State manquant");
    return res.status(400).json({ error: "Header X-Game-State manquant" });
  }

  try {
    const gameState = JSON.parse(header);
    const bot = gameState.bot;
    const grid = gameState.grid;
    const x = bot.position.x;
    const y = bot.position.y;

    let move = "STAY";
    let action = "NONE";

    if (x > 0 && grid[y][x - 1] === "diamond") move = "LEFT";
    else if (x < 4 && grid[y][x + 1] === "diamond") move = "RIGHT";
    else if (y > 0 && grid[y - 1][x] === "diamond") move = "UP";
    else if (y < 4 && grid[y + 1][x] === "diamond") move = "DOWN";

    return res.json({ move, action });
  } catch (err) {
    console.error("❌ Erreur de parsing du header X-Game-State :", err);
    return res.status(400).json({ error: "Mauvais format JSON dans X-Game-State" });
  }
});

app.listen(port , () => console.log("Le serveur tourne sur le port " + port));