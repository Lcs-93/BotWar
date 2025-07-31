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
    const points = [...trophies, ...diamonds];
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

    // 1. Sur un point → collect
    if (points.some(p => p.x === myX && p.y === myY)) {
      return res.json({ move: "STAY", action: "COLLECT" });
    }

    // 2. Adjacent à un point → va dessus et collect
    for (const d of dirs) {
      const nx = myX + d.dx;
      const ny = myY + d.dy;
      if (isValid(nx, ny) && points.some(p => p.x === nx && p.y === ny) && !isDanger(nx, ny)) {
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

    // 4. Ennemi proche → bombe
    if (enemies.some(e => dist(me, e) <= 2) && myBombs < 3) {
      return res.json({ move: "STAY", action: "BOMB", bombType: "timer" });
    }

    // 5. Aller vers point le plus proche (sans danger)
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

      const directions = dirs
        .map(d => ({
          ...d,
          nx: myX + d.dx,
          ny: myY + d.dy,
          distance: dist({ x: myX + d.dx, y: myY + d.dy }, target)
        }))
        .filter(d => isValid(d.nx, d.ny) && !isDanger(d.nx, d.ny))
        .sort((a, b) => a.distance - b.distance);

      if (directions.length > 0) {
        return res.json({ move: directions[0].move, action: "NONE" });
      }
    }

    // 6. Si aucun point trouvé ou bloqué, bouger vers case safe aléatoire
    const safeMoves = dirs.filter(d => {
      const nx = myX + d.dx;
      const ny = myY + d.dy;
      return isValid(nx, ny) && !isDanger(nx, ny);
    });

    if (safeMoves.length > 0) {
      const move = safeMoves[Math.floor(Math.random() * safeMoves.length)].move;
      return res.json({ move, action: "NONE" });
    }

    // 7. Sinon reste
    return res.json({ move: "STAY", action: "NONE" });

  } catch (e) {
    console.error("Erreur:", e);
    return res.json({ move: "STAY", action: "NONE" });
  }
});

app.listen(port, () => console.log("Le serveur tourne sur le port " + port));
