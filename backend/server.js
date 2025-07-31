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
    const points = [...(game.diamonds || []), ...(game.trophies || [])];
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

    // 1. Si point sous le bot → collecter
    if (points.some(p => p.x === myX && p.y === myY)) {
      return res.json({ move: 'STAY', action: 'COLLECT' });
    }

    // 2. Si ennemi adjacent → ATTACK
    for (const d of dirs) {
      const nx = myX + d.dx;
      const ny = myY + d.dy;
      if (isEnemy(nx, ny)) {
        return res.json({ move: d.move, action: 'ATTACK' });
      }
    }

    // 3. Si danger proche → ne rien faire ou bouger en sécurité
    for (const d of dirs) {
      const nx = myX + d.dx;
      const ny = myY + d.dy;
      if (isValid(nx, ny) && !isDanger(nx, ny)) {
        return res.json({ move: d.move, action: 'NONE' });
      }
    }

    // 4. Si ennemi à distance = 2 et pas trop de bombes → poser bombe timer
    if (enemies.some(e => dist(me, e) === 2) && myBombs < 3) {
      return res.json({ move: 'STAY', action: 'BOMB', bombType: 'timer' });
    }

    // 5. Sinon aller vers point le plus proche en évitant les bombes et ennemis
    let best = null;
    let minDist = Infinity;
    for (const p of points) {
      const d = dist(me, p);
      if (d < minDist && !isDanger(p.x, p.y)) {
        best = p;
        minDist = d;
      }
    }

    if (best) {
      // Choisir une direction vers la cible
      const dx = best.x - myX;
      const dy = best.y - myY;
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

    // 6. Si bloqué → STAY
    return res.json({ move: 'STAY', action: 'NONE' });

  } catch (e) {
    console.error('Erreur :', e);
    return res.json({ move: 'STAY', action: 'NONE' });
  }
});

app.listen(port , () => console.log("Le serveur tourne sur le port " + port));