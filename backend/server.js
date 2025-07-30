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
    const gameState = JSON.parse(req.headers['x-game-state']);
    const { x: botX, y: botY } = gameState.you;
    const grid = gameState.grid;

    const directions = [
        { dx: 0, dy: -1, move: 'UP' },
        { dx: 0, dy: 1, move: 'DOWN' },
        { dx: -1, dy: 0, move: 'LEFT' },
        { dx: 1, dy: 0, move: 'RIGHT' }
    ];

    let target = null;
    let minDist = Infinity;

    // Trouver la case avec un point ou un trophée le plus proche
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            const cell = grid[y][x];
            const hasPoint = cell.points && cell.points.length > 0;
            const hasTrophy = cell.points && cell.points.some(p => p.id === 'trophy');

            if (hasPoint || hasTrophy) {
                const dist = Math.abs(botX - x) + Math.abs(botY - y);
                if (dist < minDist) {
                    minDist = dist;
                    target = { x, y };
                }
            }
        }
    }

    let move = 'STAY';

    if (target) {
        const dx = target.x - botX;
        const dy = target.y - botY;

        if (Math.abs(dx) > Math.abs(dy)) {
            move = dx > 0 ? 'RIGHT' : 'LEFT';
        } else if (dy !== 0) {
            move = dy > 0 ? 'DOWN' : 'UP';
        }
    }

    return res.json({ move, action: "NONE" });
});

app.listen(port , () => console.log("Le serveur tourne sur le port " + port));