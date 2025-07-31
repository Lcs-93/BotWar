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
    const points = [...trophies, ...diamonds]; // priorité trophée
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
      bombs.some(b => dist({ x, y }, b) <= 1); // bombe sur ou adjacent

    const isEnemy = (x, y) => enemies.some(e => e.x === x && e.y === y);

    // 1. Point adjacent ? → go collect (sans aller sur bombe)
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

    // 2. Ennemi adjacent → attaque
    for (const d of dirs) {
      const nx = myX + d.dx;
      const ny = myY + d.dy;
      if (isEnemy(nx, ny)) {
        return res.json({ move: d.move, action: "ATTACK" });
      }
    }

    // 3. Ennemi proche ? → poser bombe si on a moins de 3
    if (enemies.some(e => dist(me, e) <= 2) && myBombs < 3) {
      return res.json({ move: "STAY", action: "BOMB", bombType: "timer" });
    }

    // 4. Aller vers point le plus proche sans danger
    let target = null;
    let minD = Infinity;
    for (const p of points) {
      const d = dist(me, p);
      if (d < minD) {
        minD = d;
        target = p;
      }
    }

    if (target) {
      const dx = target.x - myX;
      const dy = target.y - myY;

      const preferred = Math.abs(dx) >= Math.abs(dy) ? ["x", "y"] : ["y", "x"];

      for (const axis of preferred) {
        let dir = null;
        if (axis === "x" && dx !== 0) {
          dir = dirs.find(d => d.dx === Math.sign(dx));
        }
        if (axis === "y" && dy !== 0) {
          dir = dirs.find(d => d.dy === Math.sign(dy));
        }
        if (dir) {
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

    // 5. Aucun objectif safe ? → rester
    return res.json({ move: "STAY", action: "NONE" });
  } catch (e) {
    console.error("Erreur:", e);
    return res.json({ move: "STAY", action: "NONE" });
  }
});

app.listen(port, () => console.log("Le serveur tourne sur le port " + port));
