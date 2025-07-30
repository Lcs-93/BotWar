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
  const gameState = req.body || req.query || {};
  const position = gameState.position || [2, 2];
  const map = gameState.map || [[]];
  const [x, y] = position;
  const current = map?.[y]?.[x];

  // 1. Collecte si ressource
  if (current === "diamond" || current === "trophy") {
    return res.json({ move: "STAY", action: "COLLECT" });
  }

  // 2. Bombe si ennemi proche
  if (isEnemyNearby(map, x, y)) {
    return res.json({ move: "STAY", action: "BOMB", bombType: "proximity" });
  }

  // 3. Trouver une ressource
  let target = null;
  for (let j = 0; j < map.length; j++) {
    for (let i = 0; i < map[j].length; i++) {
      if (["trophy", "diamond"].includes(map[j][i])) {
        target = [i, j];
        break;
      }
    }
    if (target) break;
  }

  // 4. Se déplacer vers la ressource
  let move = "STAY";
  if (target) {
    const [tx, ty] = target;
    if (tx < x) move = "LEFT";
    else if (tx > x) move = "RIGHT";
    else if (ty < y) move = "UP";
    else if (ty > y) move = "DOWN";
  }

  return res.json({ move, action: "MOVE" });
});

app.listen(port , () => console.log("Le serveur tourne sur le port " + port));