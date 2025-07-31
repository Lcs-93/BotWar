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
    const diamonds = game.diamonds || [];
    const trophies = game.trophies || [];
    const points = [...trophies, ...diamonds]; // priorité trophées
    const myBombs = bombs.filter(b => b.owner === myId).length;

    const gridWidth = game.width || 5;
    const gridHeight = game.height || 5;

    const isValid = (x, y) => x >= 0 && y >= 0 && x < gridWidth && y < gridHeight;
    const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    const isBomb = (x, y) => bombs.some(b => b.x === x && b.y === y);
    const isEnemy = (x, y) => enemies.some(e => e.x === x && e.y === y);
    const isDanger = (x, y) => isBomb(x, y) || isEnemy(x, y);

    const dirs = [
      { dx: 0, dy: -1, move: 'UP' },
      { dx: 0, dy: 1, move: 'DOWN' },
      { dx: -1, dy: 0, move: 'LEFT' },
      { dx: 1, dy: 0, move: 'RIGHT' }
    ];

    // 1. Si le bot est sur un point (trophée ou diamant) → collecter
    if (points.some(p => p.x === myX && p.y === myY)) {
      return res.json({ move: 'STAY', action: 'COLLECT' });
    }

    // 2. Si un point est adjacent → aller dessus et collecter
    for (const d of dirs) {
      const nx = myX + d.dx;
      const ny = myY + d.dy;
      if (isValid(nx, ny) && points.some(p => p.x === nx && p.y === ny) && !isDanger(nx, ny)) {
        return res.json({ move: d.move, action: 'COLLECT' });
      }
    }

    // 3. Si ennemi adjacent → attaque
    for (const d of dirs) {
      const nx = myX + d.dx;
      const ny = myY + d.dy;
      if (isEnemy(nx, ny)) {
        return res.json({ move: d.move, action: 'ATTACK' });
      }
    }

    // 4. Si ennemi à distance = 2 et peu de bombes → poser bombe
    if (enemies.some(e => dist(me, e) === 2) && myBombs < 3) {
      return res.json({ move: 'STAY', action: 'BOMB', bombType: 'timer' });
    }

    // 5. Aller vers le point le plus proche (en priorité trophées), en évitant le danger
    let target = null;
    let minDist = Infinity;
    for (const p of points) {
      const d = dist(me, p);
      if (d < minDist && !isDanger(p.x, p.y)) {
        target = p;
        minDist = d;
      }
    }

    if (target) {
      const dx = target.x - myX;
      const dy = target.y - myY;
      const moveFirst = Math.abs(dx) >= Math.abs(dy) ? ['x', 'y'] : ['y', 'x'];

      for (const axis of moveFirst) {
        let dir;
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
            return res.json({ move: dir.move, action: 'NONE' });
          }
        }
      }
    }

    // 6. Si aucune action sûre → STAY
    return res.json({ move: 'STAY', action: 'NONE' });

  } catch (e) {
    console.error('Erreur :', e);
    return res.json({ move: 'STAY', action: 'NONE' });
  }
});

app.listen(port, () => console.log("Le serveur tourne sur le port " + port));
