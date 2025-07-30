const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bot-War API is running. Try /action");
});

app.get('/action', (req, res) => {
  const gameStateHeader = req.get('X-Game-State');
  if (!gameStateHeader) {
    return res.status(400).json({ error: 'Missing X-Game-State header' });
  }

  const gameState = JSON.parse(gameStateHeader);
  const { you, grid } = gameState;

  const x = you.x;
  const y = you.y;

  const directions = [
    { dx: 0, dy: -1, move: "UP" },
    { dx: 0, dy: 1, move: "DOWN" },
    { dx: -1, dy: 0, move: "LEFT" },
    { dx: 1, dy: 0, move: "RIGHT" }
  ];

  // Check each adjacent cell
  for (const dir of directions) {
    const newX = x + dir.dx;
    const newY = y + dir.dy;

    // Check if new coordinates are within bounds
    if (
      newY >= 0 && newY < grid.length &&
      newX >= 0 && newX < grid[0].length
    ) {
      const cell = grid[newY][newX];

      const hasPoint = cell.points.length > 0;
      const isSafe = cell.bombs.length === 0 && cell.bots.length === 0;

      if (hasPoint && isSafe) {
        return res.json({ move: dir.move, action: "NONE" });
      }
    }
  }

  // Si aucun point autour, on reste en place
  return res.json({ move: "STAY", action: "NONE" });
});

app.listen(port , () => console.log("Le serveur tourne sur le port " + port));