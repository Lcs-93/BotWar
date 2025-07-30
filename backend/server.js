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
  const gameState = req.body || req.query; // selon comment c'est envoyé
  const botPosition = gameState.position; // ex: [2, 2]
  const map = gameState.map; // tableau 2D

  const [x, y] = botPosition;
  const currentCell = map[y][x];

  // Si sur une ressource : collecter
  if (currentCell === 'diamond' || currentCell === 'trophy') {
    return res.json({
      move: 'STAY',
      action: 'COLLECT'
    });
  }

  // Cherche la première ressource sur la grille
  let target = null;
  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[row].length; col++) {
      if (map[row][col] === 'diamond' || map[row][col] === 'trophy') {
        target = [col, row]; // attention x = col, y = row
        break;
      }
    }
    if (target) break;
  }

  let move = 'STAY';
  if (target) {
    const [tx, ty] = target;
    if (tx < x) move = 'LEFT';
    else if (tx > x) move = 'RIGHT';
    else if (ty < y) move = 'UP';
    else if (ty > y) move = 'DOWN';
  }

  res.json({
    move,
    action: 'MOVE'
  });
});

app.listen(port , () => console.log("Le serveur tourne sur le port " + port));