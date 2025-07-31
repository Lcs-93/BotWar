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
  try {
    const game = JSON.parse(req.headers['x-game-state']);
    const me = game.you;
    const myId = me.id;
    const myX = me.x;
    const myY = me.y;

    const enemies = (game.bots || []).filter(b => b.id !== myId);
    const bombs = game.bombs || [];
    const trophies = game.trophies || [];
    const diamonds = game.diamonds || [];
    const points = [...trophies, ...diamonds]; // trophées en priorité car listés avant
    const myBombs = bombs.filter(b => b.owner === myId).length;

    const gridWidth = game.width || 5;
    const gridHeight = game.height || 5;

    const isValid = (x, y) => x >= 0 && y >= 0 && x < gridWidth && y < gridHeight;
    const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

    const dirs = [
      { dx: 0, dy: -1, move: 'UP' },
      { dx: 0, dy: 1, move: 'DOWN' },
      { dx: -1, dy: 0, move: 'LEFT' },
      { dx: 1, dy: 0, move: 'RIGHT' }
    ];

    const isDanger = (x, y) =>
      bombs.some(b => Math.abs(b.x - x) + Math.abs(b.y - y) <= 1);

    const isEnemy = (x, y) => enemies.some(e => e.x === x && e.y === y);

    // 1. Sur un trophée ou diamant → collect
    if (points.some(p => p.x === myX && p.y === myY)) {
      return res.json({ move: "STAY", action: "COLLECT" });
    }

    // 2. Adjacent à un point ? → va dessus et collect
    for (const d of dirs) {
      const nx = myX + d.dx;
      const ny = myY + d.dy;
      if (isValid(nx, ny) && points.some(p => p.x === nx && p.y === ny)) {
        return res.json({ move: d.move, action: "COLLECT" });
      }
    }

    // 3. Ennemi adjacent → attaque
    for (const d of dirs) {
      const nx = myX + d.dx;
      const ny = myY + d.dy;
      if (isEnemy(nx, ny)) {
        return res.json({ move: d.move, action: "ATTACK" });
      }
    }

    // 4. Ennemi proche → pose bombe si pas trop
    if (enemies.some(e => dist(me, e) <= 2) && myBombs < 3) {
      return res.json({ move: "STAY", action: "BOMB", bombType: "timer" });
    }

    // 5. Cherche le point le plus proche
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

      const preferred = Math.abs(dx) >= Math.abs(dy) ? ['x', 'y'] : ['y', 'x'];

      for (const axis of preferred) {
        let dir = null;
        if (axis === 'x' && dx !== 0) {
          dir = dirs.find(d => d.dx === Math.sign(dx));
        }
        if (axis === 'y' && dy !== 0) {
          dir = dirs.find(d => d.dy === Math.sign(dy));
        }
        if (dir) {
          const nx = myX + dir.dx;
          const ny = myY + dir.dy;
          if (isValid(nx, ny) && !isDanger(nx, ny)) {
            return res.json({ move: dir.move, action: "NONE" });
          }
        }
      }
    }

    // Sinon, reste là
    return res.json({ move: "STAY", action: "NONE" });

  } catch (e) {
    console.error("Erreur:", e);
    return res.json({ move: "STAY", action: "NONE" });
  }
});

app.listen(port, () => console.log("Le serveur tourne sur le port " + port));
