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
    const game = JSON.parse(req.headers["x-game-state"]);
    const me = game.you;
    const myId = me.id;
    const myX = me.x;
    const myY = me.y;

    const enemies = (game.bots || []).filter(b => b.id !== myId);
    const bombs = game.bombs || [];
    const trophies = game.trophies || [];
    const diamonds = game.diamonds || [];
    const points = [...trophies, ...diamonds];
    const myBombs = bombs.filter(b => b.owner === myId).length;

    const gridWidth = game.width || 5;
    const gridHeight = game.height || 5;

    const isValid = (x, y) => x >= 0 && y >= 0 && x < gridWidth && y < gridHeight;
    const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

    const dirs = [
      { dx: 0, dy: -1, move: "UP" },
      { dx: 0, dy: 1, move: "DOWN" },
      { dx: -1, dy: 0, move: "LEFT" },
      { dx: 1, dy: 0, move: "RIGHT" },
    ];

    const isDanger = (x, y) =>
      bombs.some(b => dist({ x, y }, b) <= 1);

    const isEnemy = (x, y) =>
      enemies.some(e => e.x === x && e.y === y);

    // 1. COLLECT adjacent ?
    for (const d of dirs) {
      const nx = myX + d.dx;
      const ny = myY + d.dy;
      if (
        isValid(nx, ny) &&
        points.some(p => p.x === nx && p.y === ny) &&
        !isDanger(nx, ny)
      ) {
        return res.json({ move: d.move, action: "COLLECT" });
      }
    }

    // 2. ATTACK adjacent ?
    for (const d of dirs) {
      const nx = myX + d.dx;
      const ny = myY + d.dy;
      if (isEnemy(nx, ny)) {
        return res.json({ move: d.move, action: "ATTACK" });
      }
    }

    // 3. BOMBER si ennemi proche
    if (enemies.some(e => dist(me, e) <= 2) && myBombs < 3) {
      return res.json({ move: "STAY", action: "BOMB", bombType: "timer" });
    }

    // 4. Aller vers un point (même indirectement)
    if (points.length > 0) {
      points.sort((a, b) => dist(me, a) - dist(me, b)); // par plus proche

      for (const point of points) {
        const dx = point.x - myX;
        const dy = point.y - myY;

        const moves = [];

        if (dx < 0) moves.push(dirs.find(d => d.move === "LEFT"));
        if (dx > 0) moves.push(dirs.find(d => d.move === "RIGHT"));
        if (dy < 0) moves.push(dirs.find(d => d.move === "UP"));
        if (dy > 0) moves.push(dirs.find(d => d.move === "DOWN"));

        for (const dir of moves) {
          const nx = myX + dir.dx;
          const ny = myY + dir.dy;
          if (isValid(nx, ny) && !isDanger(nx, ny)) {
            const isPoint = points.some(p => p.x === nx && p.y === ny);
            return res.json({
              move: dir.move,
              action: isPoint ? "COLLECT" : "NONE",
            });
          }
        }
      }
    }

    return res.json({ move: "STAY", action: "NONE" });
  } catch (e) {
    console.error("Erreur:", e);
    return res.json({ move: "STAY", action: "NONE" });
  }
});

app.listen(port, () => console.log("Serveur OK sur le port " + port));
