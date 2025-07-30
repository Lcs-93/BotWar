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
  try {
    // Le GameState est envoyé dans un header custom (à confirmer)
    const gameStateHeader = req.headers["x-game-state"];
    if (!gameStateHeader) {
      return res.status(400).json({ error: "Missing x-game-state header" });
    }

    const gameState = JSON.parse(gameStateHeader);
    const botPosition = gameState.position;
    const map = gameState.map;

    if (!botPosition || !map) {
      return res.status(400).json({ error: "Invalid game state" });
    }

    const [x, y] = botPosition;
    const currentCell = map[y][x];

    if (currentCell === "diamond" || currentCell === "trophy") {
      return res.json({ move: "STAY", action: "COLLECT" });
    }

    // Cherche la ressource la plus proche
    let target = null;
    for (let row = 0; row < map.length; row++) {
      for (let col = 0; col < map[row].length; col++) {
        if (map[row][col] === "diamond" || map[row][col] === "trophy") {
          target = [col, row];
          break;
        }
      }
      if (target) break;
    }

    let move = "STAY";
    if (target) {
      const [tx, ty] = target;
      if (tx < x) move = "LEFT";
      else if (tx > x) move = "RIGHT";
      else if (ty < y) move = "UP";
      else if (ty > y) move = "DOWN";
    }

    res.json({ move, action: "MOVE" });
  } catch (error) {
    console.error("Error in /action:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port , () => console.log("Le serveur tourne sur le port " + port));